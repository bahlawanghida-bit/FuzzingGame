#!/usr/bin/env python3
"""Bundle src/ into single-file pages.

  index.html          full HTML document (GitHub Pages / open locally / installable PWA)
  dist/artifact.html  body-only variant for hosts that wrap the page in their own skeleton

Usage: python3 build.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
JS_ORDER = [
    "content/glossary.js", "content/cast.js", "content/ch0_ch1.js", "content/ch2_ch3.js", "content/viva.js",
    "games/core.js", "games/fox.js", "games/chat.js", "games/f4a.js", "app.js",
]

def bundle() -> str:
    shell = (SRC / "shell.html").read_text(encoding="utf-8")
    css = (SRC / "styles.css").read_text(encoding="utf-8")
    js = "\n;\n".join((SRC / p).read_text(encoding="utf-8") for p in JS_ORDER)
    js = js.replace("</script", "<\\/script")
    return shell.replace("/*CSS*/", css).replace("/*JS*/", js)

def main() -> None:
    body = bundle()
    head_extra = (
        '<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<link rel="manifest" href="manifest.webmanifest">\n'
        '<link rel="icon" href="icon.svg" type="image/svg+xml">\n'
        '<link rel="apple-touch-icon" href="icon.svg">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n'
    )
    sw = ("<script>if('serviceWorker' in navigator && location.protocol.startsWith('http'))"
          "{navigator.serviceWorker.register('sw.js').catch(function(){});}</script>\n")
    full = f"<!doctype html>\n<html lang=\"en\">\n<head>\n{head_extra}</head>\n<body>\n{body}\n{sw}</body>\n</html>\n"
    (ROOT / "index.html").write_text(full, encoding="utf-8")
    (ROOT / "dist").mkdir(exist_ok=True)
    (ROOT / "dist" / "artifact.html").write_text(body, encoding="utf-8")
    print(f"index.html {len(full)//1024} KB · dist/artifact.html {len(body)//1024} KB")

if __name__ == "__main__":
    main()
