#!/usr/bin/env python3
"""Form values for the apply scripts: the ```json block under '## Form values' in answers.md.

As a filter: python3 -I scripts/answers.py < x.js > run.js   (replaces /*ANSWERS*/{} with the values)
As a module: load('answers.md') -> dict
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load(path=os.path.join(ROOT, 'answers.md')):
    m = re.search(r'^## Form values.*?```json\n(.*?)\n```', open(path).read(), re.S | re.M)
    if not m:
        sys.exit('answers.md has no "## Form values" json block')
    return json.loads(m.group(1))


if __name__ == '__main__':
    sys.stdout.write(sys.stdin.read().replace('/*ANSWERS*/{}', json.dumps(load(), ensure_ascii=False)))
