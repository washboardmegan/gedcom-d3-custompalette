# gedcom-d3

A clone of https://github.com/mister-blanket/gedcom-d3, so I can control A [Blood Lines](https://github.com/mister-blanket/blood-lines) fork's color palette in a shareable way.

## Usage

npm install --save gedcom-d3

## API

* `.parse(string)` -> JSON
* `d3ize(parse(string));` -> d3-capable JSON

```javascript
import gedcomFile from './gedcoms/sample_ancestors.ged';

const d3Data = d3ize(parse(gedcomFile)); // Feed d3Data into 3d-force-graph
```
