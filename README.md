Based on [tmcw/parse-gedcom](https://github.com/tmcw/parse-gedcom), this project seeks to improve d3ize functionality to make Gedom data in more fully-functional d3 capable JSON, specifically for use in plotting with [vasturiano/3d-force-graph](https://github.com/vasturiano/3d-force-graph).

## Usage

npm install --save gedcom-d3

## API

* `.parse(string)` -> JSON
* `d3ize(parse(string));` -> d3-capable JSON
