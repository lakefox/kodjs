import hljs from 'highlight.js/lib/core';
import css from 'css';

function kod() {
    let cssMap = {};
    let bg = "#212121";
    let cn;

    this.init = (canvas, language, styleSheet, background = "#212121") => {
        bg = background
        cn = canvas;
        return new Promise(async (resolve, reject) => {
            fetch(`https://unpkg.com/highlight.js@11.7.0/styles/${styleSheet}.css`)
                .then(e => e.text())
                .then((data) => {
                    let style = css.parse(data.toString());
                    let rules = style.stylesheet.rules;
                    for (let a = 0; a < rules.length; a++) {
                        const rule = rules[a];
                        const selectors = flatten(rule.selectors.map(e => e.split(" ")));
                        for (let b = 0; b < selectors.length; b++) {
                            if (cssMap[selectors[b]] == undefined) {
                                cssMap[selectors[b]] = [];
                            }
                            cssMap[selectors[b]].push(...rule.declarations);
                        }
                    }
                    fetch(`https://unpkg.com/@highlightjs/cdn-assets@11.7.0/es/languages/${language}.min.js`).then(e => e.text()).then((mod) => {
                        mod = mod.slice(mod.indexOf("hljsGrammar=") + 12, mod.indexOf("export default hljsGrammar;"));
                        let fun = new Function('return ' + mod);
                        hljs.registerLanguage(language, fun());
                        resolve();
                    }).catch(console.error);
                }).catch(console.error);
        });
    }

    this.print = (code) => {
        return new Promise(async (resolve, reject) => {
            let lineHeight = 22;
            // let lineHeight = 22;
            let padding = {
                top: 5,
                left: 20
            }
            let html = hljs.highlightAuto(code).value;

            let tokens = tokenise(html);
            let ctx = cn.getContext("2d");
            ctx.font = `20px Monospace`;
            let longest = code.split("\n").sort((a, b) => { return b.length - a.length })[0];
            let width = ctx.measureText(longest).width + 20 + padding.left;
            cn.width = width;
            ctx.width = width;

            let leftPad = padding.left;
            let topPad = padding.top + lineHeight;

            let cc = "";
            tokens.forEach((e) => { cc += e.content });
            let escaped = cc.match(/\&[0-9A-Za-z\#]+\;/g)
            let escapedMap = {};
            if (escaped) {
                escaped.forEach((e) => {
                    let ind = cc.indexOf(e);
                    cc = cc.split("");
                    cc.splice(ind, e.length, code.slice(ind, ind + 1));
                    escapedMap[e] = code.slice(ind, ind + 1)
                    cc = cc.join("");
                })
            }
            let oldTokens = tokens.slice(0);
            let addedItems = 0;
            for (let a = 0; a < oldTokens.length; a++) {
                if (countOccurrences(oldTokens[a].content, "\n") > 1) {
                    let content = oldTokens[a].content.split("\n");
                    let newItems = [];
                    for (let b = 0; b < content.length; b++) {
                        newItems.push({
                            styles: oldTokens[a].styles,
                            content: content[b] + "\n"
                        });
                    }
                    tokens.splice(tokens.indexOf(oldTokens[a]), 1, ...newItems);
                    addedItems += newItems.length;
                }

            }
            let lineCount = tokens.reduce((a, e) => { return (a || 0) + e.content.split("\n").length - 1 }) + 2;
            let height = (lineHeight * lineCount) + (padding.top * 2);
            cn.height = height;
            ctx.height = height;
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, width, height);
            for (let a = 0; a < tokens.length; a++) {
                const token = tokens[a];
                let classes = [];
                if (token.styles) {
                    classes = flatten(token.styles.map(e => cssMap[`.${e}`]).filter(e => e));
                }
                for (let b = 0; b < classes.length; b++) {
                    if (classes[b].property == "color") {
                        ctx.fillStyle = classes[b].value;
                    }
                    if (classes[b].property == "font-style") {
                        ctx.font = `${classes[b].value} 20px Monospace`;
                    } else {
                        ctx.font = `20px Monospace`;
                    }
                }
                let lines = token.content.split("\n");
                for (let b = 0; b < lines.length; b++) {
                    let line = lines[b];
                    if (token.content.indexOf("\n") > -1 && b > 0) {
                        topPad += countOccurrences(token.content, "\n") * lineHeight;
                        leftPad = padding.left;
                    }
                    let esc = line.match(/\&[0-9A-Za-z\#]+\;/g);
                    if (esc) {
                        for (let c = 0; c < esc.length; c++) {
                            let ind = line.indexOf(esc[c]);
                            line = line.split("");
                            line.splice(ind, esc[c].length, escapedMap[esc[c]]);
                            line = line.join("");
                        }
                    }
                    ctx.fillText(line, leftPad, topPad);
                    leftPad += ctx.measureText(line).width;
                }
            }
            resolve({ width: width, height: height });
        })
    }
}

function tokenise(html) {
    return flatten(html.split("</span>")
        .map(e => e.split('<span class="')
            .filter(f => f != "")
            .map((g) => {
                return {
                    styles: g.indexOf("hljs-") > -1 ? g.slice(g.indexOf("hljs-"), g.indexOf('">')).split(" ") : ["hljs"],
                    content: g.indexOf("hljs-") > -1 ? g.slice(g.indexOf('">') + 2) : g
                }
            })));
}

function flatten(array) {
    return array.reduce(function (memo, el) {
        var items = Array.isArray(el) ? flatten(el) : [el];
        return memo.concat(items);
    }, []);
}

function countOccurrences(str, value) {
    var regExp = new RegExp(value, "gi");
    return (str.match(regExp) || []).length;
}
if (window) {
    window.kod = kod;
}
export default kod;