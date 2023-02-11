# gedcom-d3

A cloned version of https://github.com/mister-blanket/gedcom-d3, so I could control the color palette without too much code refactoring. 

View an implementation at [mister-blanket/blood-lines](https://github.com/mister-blanket/blood-lines)

## Usage

npm install --save gedcom-d3

## API

* `.parse(string)` -> JSON
* `d3ize(parse(string));` -> d3-capable JSON

```javascript
import gedcomFile from './gedcoms/sample_ancestors.ged';

const d3Data = d3ize(parse(gedcomFile)); // Feed d3Data into 3d-force-graph
```
