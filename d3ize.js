const d3ize = tree => {
  const notes = tree.filter(hasTag('NOTE'));
  let surnameList = []
  const peopleNodes = tree
    .filter(hasTag('INDI'))
    .map(p => ( toNode(p, notes, surnameList )));
  const families = tree.filter(hasTag('FAM'));
  const links = families.reduce((memo, family) => {
    return memo.concat(familyLinks(family, peopleNodes));
  }, []);
  assignFy(peopleNodes, links);
  return {
    nodes: peopleNodes,
    links: links,
    families: families,
    surnameList: surnameList
  };
}

// Tag search function
const hasTag = val => {
  return node => {
    return node.tag === val;
  };
}

// Data search function
const hasData = val => {
  return node => {
    return node.data === val;
  };
}

// ID search function
const hasID = val => {
  return node => {
    return node.id === val;
  };
}

const assignFy = (peopleNodes, links) => {

  // YOB known
  let yesyob = peopleNodes.filter(p => {
    return p.yob !== '?' && !isNaN(+p.yob);
  })

  yesyob.forEach(p => p.fy = +(p.yob));

  // YOB unknown
  let noyob = peopleNodes.filter(p => {
    return p.yob === '?';
  });

  let count = 10;

  // Cycle through list, adding fy until all complete
  while (noyob.length > 0 && count > 0) {

    let tempnoyob = noyob.slice();

    tempnoyob.forEach((p, index) => {

      // Build array of family
      let tpFamily = [];

      links.forEach(link => {
        if (link.source == p.id) {
          tpFamily.push({pRole: 'source', pType: link.sourceType, other: link.target, oType: link.targetType});
        } else if (link.target == p.id) {
          tpFamily.push({pRole: 'target', pType: link.targetType, other: link.source, oType: link.sourceType});
        };
      });

      // Check family for YOB
      tpFamily.forEach(member => { // USE SOME() INSTEAD OF FOREACH!!!
        peopleNodes.forEach(person => { // USE SOME() INSTEAD OF FOREACH!!!
          if (person.id == member.other && person.fy !== undefined) {

            // Person is source
            if (member.pRole === 'source') {

              // Person is husband
              if (member.pType === 'HUSB' && member.oType === 'WIFE') {
                p.fy = +person.fy - 3;

              // Person is father
              } else if (member.pType === 'HUSB' && member.oType === 'CHIL') {
                p.fy = +person.fy - 30;

              // Person is mother
              } else if (member.pType === 'WIFE') {
                p.fy = +person.fy - 27;
              }

              // Person is target
            } else if (member.pRole === 'target') {

              // Person is wife
              if (member.pType === 'WIFE' && member.oType === 'HUSB') {
                p.fy = +person.fy + 3;

              // Person is child of father
              } else if (member.pType === 'CHIL' && member.oType === 'HUSB') {
                p.fy = +person.fy + 30;

                // Person is child of mother
              } else if (member.pType === 'CHIL' && member.oType === 'WIFE') {
                p.fy = +person.fy + 27;
              }
            }
          }
        });
      });
      if (p.fy !== undefined) {
        noyob.splice(index,index +1);
      }
    })
    count -= 1;
  }

  const convertFy = (peopleNodes) => {
    const fyRatio = peopleNodes => {
      if (peopleNodes.length <= 50) {
        return 3;
      } else if (peopleNodes.length > 50 && peopleNodes.length <= 150) {
        return 4;
      } else if (peopleNodes.length > 150 && peopleNodes.length <= 250) {
        return 5;
      } else if (peopleNodes.length > 250){
        return 6;
      }
    };
    let allFy = [];
    peopleNodes.forEach(p => {
      if (p.fy !== undefined) {
        p.fy = p.fy * fyRatio(peopleNodes);
        allFy.push(p.fy);
      }
    })

    let total = 0;
    allFy.forEach(fy => total += fy);
    let average = total/allFy.length;

    peopleNodes.forEach(p => {
      if (p.fy !== undefined) {
        p.fy = -(p.fy - average);
      }
    });
  }
  convertFy(peopleNodes);
}

// Get title
const getTitle = p => {
  const title = (p.tree.filter(hasTag('TITL')) || []);
  if (title.length > 0) {
    return title[title.length -1].data;
  }
}

// Get full name
const getName = p => {
  let nameNode = (p.tree.filter(hasTag('NAME')) || [])[0];
  if (nameNode) {
    return nameNode.data.replace(/\//g, '');
  } else {
    return '?';
  }
}

// Get first name
const getFirstName = p => {

  // Find 'NAME' tag
  const nameNode = (p.tree.filter(hasTag('NAME')) || [])[0];
  if (nameNode) {

    // Find 'GIVN' tag
    let firstNameNode = (nameNode.tree.filter(hasTag('GIVN')) || [])[0];
    if (firstNameNode) {

      // Remove middle name
      if (firstNameNode.data.search(' ') !== -1) {
        return firstNameNode.data.slice(0, firstNameNode.data.search(' '));
      } else {
        return firstNameNode.data;
      }
    } else {
      return '?';
    }
  } else {
    return '?';
  }
}

// Get surname
const getSurname = p => {

  // Find 'NAME' tag
  const nameNode = (p.tree.filter(hasTag('NAME')) || [])[0];
  if (nameNode) {

    // Find 'SURN' tag
    const surnameNode = (nameNode.tree.filter(hasTag('SURN')) || [])[0];

    // If surname listed
    if (surnameNode) {

      // Remove alternate surnames
      if (surnameNode.data.search(',') !== -1) {
        return surnameNode.data.slice(0, surnameNode.data.search(','));
      } else {
        return surnameNode.data;
      }

    // Derive surname from name
    } else {
      nameArr = nameNode.data.split(' ');

      // Look for forward slashes
      let isSlashes = nameArr.some(str => str[0] === "/");
      if (isSlashes) {
        return nameArr.find(str => str[0] === "/").replace(/\//g, '');

      // no slashes, use final item in array
      } else {
        nameArr[nameArr.length -1] = nameArr[nameArr.length -1].replace(/\//g, '')
        return nameArr.length > 1 ? nameArr[nameArr.length -1] : "Hrm"
      }
    }
  } else {
    return '?';
  }
}

// Get gender
const getGender = p => {

  // Find 'SEX' tag
  let genderNode = (p.tree.filter(hasTag('SEX')) || [])[0];
  if (genderNode) {
    return genderNode.data;
  } else {
    return 'Unknown';
  }
}

// Get date of birth
const getDOB = p => {

  // Find 'BIRT' tag
  let dobNode = (p.tree.filter(hasTag('BIRT')) || [])[0];
  if (dobNode) {

    // Find 'DATE' tag
    let dateNode = (dobNode.tree.filter(hasTag('DATE')) || [])[0];
    if (dateNode) {
      return dateNode.data;
    } else {
      return '?';
    }
  } else {
    return '?';
  }
}

// Get year of birth
const getYOB = p => {

  // Find 'BIRT' tag
  let dobNode = (p.tree.filter(hasTag('BIRT')) || [])[0];
  if (dobNode) {

    // Find 'DATE' tag
    let dateNode = (dobNode.tree.filter(hasTag('DATE')) || [])[0];
    if (dateNode) {
      return dateNode.data.slice(-4);
    } else {
      return '?';
    }
  } else {
    return '?';
  }
}

// Get place of birth
const getPOB = p => {

  // Find 'BIRT' tag
  let pobNode = (p.tree.filter(hasTag('BIRT')) || [])[0];
  if (pobNode) {

    // Find 'DATE' tag
    let placeNode = (pobNode.tree.filter(hasTag('PLAC')) || [])[0];
    if (placeNode) {
      return placeNode.data;
    } else {
      return '';
    }
  } else {
    return '';
  }
}

// Get date of death
const getDOD = p => {

  // Find 'DEAT' tag
  let dobNode = (p.tree.filter(hasTag('BIRT')) || [])[0];
  let dodNode = (p.tree.filter(hasTag('DEAT')) || [])[0];
  if (dodNode) {

    // Find 'DATE' tag
    let dateNode = (dodNode.tree.filter(hasTag('DATE')) || [])[0];
    if (dateNode) {
      return dateNode.data;
    } else {
      return '?';
    }
  } else if (dobNode) {
    let dateNode = (dobNode.tree.filter(hasTag('DATE')) || [])[0];
    if (dateNode) {
      return dateNode.data.slice(-4) + 100;
    } else {
      return '?';
    }
  } else {
    return 'Present';
  }
}

// Get year of death
const getYOD = p => {
  let thisYear = new Date().getFullYear();

  // Find 'DEAT' tag
  let dobNode = (p.tree.filter(hasTag('BIRT')) || [])[0];
  let dodNode = (p.tree.filter(hasTag('DEAT')) || [])[0];

  // If DEATH tag
  if (dodNode) {

    // Find 'DATE' tag
    let dateNode = (dodNode.tree.filter(hasTag('DATE')) || [])[0];

    // If death date listed
    if (dateNode) {
      return dateNode.data.slice(-4);
    } else {
      return '?';
    }

  // BIRT tag, but no DEAT tag
  } else if (dobNode && !dodNode) {
    let dateNode = (dobNode.tree.filter(hasTag('DATE')) || [])[0];

    // If DOB listed
    if (dateNode) {

      // If born > 100 yrs ago, call dead
      if (dateNode.data.slice(-4) < (thisYear - 100)) {
        return '?';
      } else {
        return 'Present';
      }
    } else {
      return '?';
    }

  // no DEAT or BIRT tag
  } else {
    return '?';
  }
}

// Get place of birth
const getPOD = p => {

  // Find 'BIRT' tag
  let podNode = (p.tree.filter(hasTag('DEAT')) || [])[0];
  if (podNode) {

    // Find 'DATE' tag
    let placeNode = (podNode.tree.filter(hasTag('PLAC')) || [])[0];
    if (placeNode) {
      return placeNode.data;
    } else {
      return '';
    }
  } else {
    return '';
  }
}

// Get relatives
const getFamilies = p => {
  let families = [];
  let pediInfo;
  // If child
  let familyNode1 = (p.tree.filter(hasTag('FAMC')) || []);
  if (familyNode1) {
    for (let i = 0; i < familyNode1.length; i++) {
      if (familyNode1[i].tree.length > 0) {
        // Get pedigree info
        if (familyNode1[i].tree[0].tag == 'PEDI') {
          pediInfo = {frel: familyNode1[i].tree[0].data, mrel: familyNode1[i].tree[0].data}
        } else if (familyNode1[i].tree[0].tag == '_FREL') {
          pediInfo = {frel: familyNode1[i].tree[0].data, mrel: familyNode1[i].tree[1].data}
        }
      }

      families.push({id: familyNode1[i].data, pedi: pediInfo});
    }
  }
  let familyNode2 = (p.tree.filter(hasTag('FAMS')) || []);
  if (familyNode2) {
    for (let i = 0; i < familyNode2.length; i++) {
      families.push({id:familyNode2[i].data});
    }
  }
  return families;
}

// Get color

// from https://colordesigner.io/gradient-generator
// pale blue to 
const getColor = (p, surnameList) => {
  const colorList = 

['#00fff2', '#07fef2', '#0efdf2', '#13fcf2', '#17fbf2', '#1afaf3', '#1df9f3', '#20f8f3', '#22f7f3', '#25f6f3', '#27f5f3', '#29f4f3', '#2bf3f3', '#2cf2f3', '#2ef1f3', '#30eff4', '#31eef4', '#33edf4', '#34ecf4', '#35ebf4', '#37eaf4', '#38e9f4', '#39e8f4', '#3ae7f4', '#3be6f4', '#3ce5f4', '#3de4f4', '#3ee3f4', '#3fe2f4', '#40e1f4', '#41e0f4', '#42dff4', '#43def5', '#43ddf5', '#44dcf5', '#45dbf5', '#46daf5', '#46d9f5', '#47d8f5', '#48d7f5', '#48d6f5', '#49d5f5', '#4ad4f5', '#4ad3f5', '#4bd2f5', '#4cd1f5', '#4cd0f5', '#4dcff5', '#4dcef5', '#4ecdf5', '#4eccf5', '#4fcbf4', '#4fcaf4', '#50c9f4', '#50c8f4', '#50c7f4', '#51c6f4', '#51c5f4', '#52c4f4', '#52c3f4', '#53c2f4', '#53c1f4', '#53c0f4', '#54bff4', '#54bef4', '#54bdf4', '#55bcf4', '#55bbf4', '#55baf3', '#56b9f3', '#56b8f3', '#56b7f3', '#56b6f3', '#57b5f3', '#57b4f3', '#57b3f3', '#57b2f3', '#58b1f2', '#58b0f2', '#58aff2', '#58aef2', '#59adf2', '#59acf2', '#59abf2', '#59aaf1', '#59a9f1', '#5aa8f1', '#5aa7f1', '#5aa6f1', '#5aa5f1', '#5aa4f0', '#5aa3f0', '#5ba2f0', '#5ba1f0', '#5ba0f0', '#5b9fef', '#5b9eef', '#5b9def', '#5b9cef', '#5b9bef', '#5c9aee', '#5c99ee', '#5c98ee', '#5c97ee', '#5c96ee', '#5c95ed', '#5c94ed', '#5c93ed', '#5c92ed', '#5c91ec', '#5c90ec', '#5c8fec', '#5d8eeb', '#5d8deb', '#5d8ceb', '#5d8beb', '#5d8aea', '#5d89ea', '#5d88ea', '#5d87e9', '#5d86e9', '#5d85e9', '#5d84e8', '#5d83e8', '#5d82e8', '#5d81e7', '#5d80e7', '#5d7fe7', '#5d7ee6', '#5d7de6', '#5d7ce6', '#5d7ce5', '#5d7ae5', '#5d7ae4', '#5d79e4', '#5d78e4', '#5d77e3', '#5d76e3', '#5d75e2', '#5d74e2', '#5d73e2', '#5d72e1', '#5d71e1', '#5d70e0', '#5d6fe0', '#5d6edf', '#5d6ddf', '#5d6cde', '#5d6bde', '#5d6add', '#5d69dd', '#5d68dc', '#5d67dc', '#5d66db', '#5d65db', '#5d64da', '#5d63da', '#5d62d9', '#5d61d9', '#5d60d8', '#5d5fd8', '#5d5ed7', '#5d5dd6', '#5d5cd6', '#5d5bd5', '#5d5ad5', '#5d59d4', '#5d58d3', '#5d57d3', '#5d56d2', '#5d55d2', '#5d54d1', '#5d53d0', '#5d52d0', '#5d51cf', '#5d50ce', '#5d4fcd', '#5d4ecd', '#5d4dcc', '#5d4ccb', '#5d4bcb', '#5d4aca', '#5d49c9', '#5d48c8', '#5d47c7', '#5d46c7', '#5d45c6', '#5d44c5', '#5d43c4', '#5d42c3', '#5d41c3', '#5d40c2', '#5d3fc1', '#5d3ec0', '#5d3dbf', '#5d3cbe', '#5d3bbd', '#5d3abc', '#5d39bb', '#5d38ba', '#5d37b9', '#5d36b8', '#5d35b7', '#5d34b6', '#5d33b5', '#5d32b4', '#5d31b3', '#5d30b2', '#5d2fb1', '#5d2eb0', '#5d2daf', '#5d2cad', '#5d2aac', '#5d29ab', '#5d28aa', '#5d27a9', '#5d26a7', '#5d25a6', '#5d24a5', '#5d23a3', '#5d22a2', '#5d20a1', '#5d1f9f', '#5d1e9e', '#5d1d9c', '#5d1c9b', '#5e1b99', '#5e1998', '#5e1896', '#5e1795', '#5e1693', '#5e1491', '#5e1390', '#5e128e', '#5e118c', '#5e0f8a', '#5e0e88', '#5e0c86', '#5e0b85', '#5e0a83', '#5e0880', '#5e077e', '#5e067c', '#5e057a', '#5e0478', '#5d0375', '#5d0273', '#5d0170', '#5d006e', '#5d006b']

;


// oG Color palette

/*const getColor = (p, surnameList) => {
  const colorList = [
    '#ff7f50', // coral
    '#00b4ff', // sky blue
    '#fac641', // mexican egg yolk
    '#8a9b0f', // olive
    '#a7dbd8', // sea foam
    '#a37e58', // light brown
    '#ec4913', // burnt orange
    '#a27dbd', // soft royal purple
    '#11644d', // forest
    '#b3347c', // magenta
    '#359668', // grass & sage
    '#fab8b4', // soft pink
    '#6de627', // neon green
    '#ecd078', // tangerine
    '#bfcff7', // ligt purple blue
    '#e08e79', // blush
    '#c44d58', // rouge
    '#c4ffeb', // light sea foam
    '#a6b890', // olive sage
    '#aaaaaa', // light blue grey
    '#ffd3b5', // peach
    '#826942', // chocolate
    '#d4ee5e', // lime
    '#ecfc85', // light yellow
    '#666666', // off white
    '#ffa1c3', // newborn pink
    '#6541a3', // royal purple
    '#75616b', // dry wine
    '#71cfde', // baby foam
    '#e0e0e0', // light grey
  ];*/


  // If color description listed in GEDCOM
  const dscr = (p.tree.filter(hasTag('DSCR')) || [])[0];

  const foundName = surnameList.find(sName => sName.surname === p.surname);

  // If surname already in list
  if (foundName) {
    foundName.count = foundName.count +1;
  } else {
    surnameList.push({
      surname: p.surname,
      count: 1,
      color: colorList[surnameList.length % colorList.length]
    })
  }

  // surnameList.color = surnameList.length % colorList.length});

  // If color listed assign that
  if (dscr) {
    return dscr.data;

  // else assign color from colorList
  } else {
    return surnameList.find(sName => sName.surname === p.surname).color;
  }
}

// Get person notes
const getNotes = p => {
  return p.tree.filter(hasTag('NOTE'));
}

// Get Bio
const getBio = (p, notes) => {

  if (p.notes.length != 0) {
    let bio = '';

    // Notes for person
    p.notes.forEach(personNote => {

      // personNote.data points to NOTE object
      if (notes.length > 0) {
        notes.forEach(note => {
          if (personNote.data === note.pointer) {
            bio += note.data;

            // Concat broken up note
            if (note.tree.length > 0) { note.tree.forEach(fragment => bio += fragment.data) }

          }
        });

      // personNote.data is actual note
      } else {
        bio += personNote.data;
      }
    });
    return bio;
  }
}

const getFy = p => {
  if(p.yob === '?') {
    return 0;
  } else {
    return +(-p.yob * 3 + 6000);
  }
}

const toNode = (p, notes, surnameList) => {
  p.id = p.pointer;
  p.title = getTitle(p);
  p.name = getName(p);
  p.firstName = getFirstName(p);
  p.surname = getSurname(p);
  p.gender = getGender(p);
  p.dob = getDOB(p);
  p.yob = getYOB(p);
  p.pob = getPOB(p);
  p.dod = getDOD(p);
  p.yod = getYOD(p);
  p.pod = getPOD(p);
  p.families = getFamilies(p);
  p.color = getColor(p, surnameList);
  p.notes = getNotes(p);
  p.bio = getBio(p, notes);
  return p;
}

const familyLinks = (family, peopleNodes) => {

  let memberLinks = [];
  let maritalStatus = null;
  let pedigree;

  // Filter only individual objects from family tree
  let memberSet = family.tree.filter(function(member) {
    return member.tag && (member.tag === 'HUSB' || member.tag === 'WIFE' || member.tag === 'CHIL');
  })

  // Filter marital status events
  family.tree.filter(event => {
    if (event.tag === 'DIV' || event.tag === 'MARR') {
      if (maritalStatus !== 'DIV') {
        maritalStatus = event.tag;
      }
    }
  })

  // Iterate over each member of set to connect with other members
  while (memberSet.length > 1) {
    for (let i = 1; i < memberSet.length; i++) {

      // Exclude sibling relationships
      if (memberSet[0].tag != 'CHIL') {

        // If marital status listed
        if (memberSet[0].tag == 'HUSB' && memberSet[i].tag == 'WIFE') {
          memberLinks.push({
            "source": memberSet[0].data,
            "target": memberSet[i].data,
            "sourceType": memberSet[0].tag,
            "targetType": memberSet[i].tag,
            "type": maritalStatus
          })
        } else {

          // Filter pedigree info
          function getPedigree(personID, parentType, relInfo) {
            // GRAMPS
            let person = peopleNodes.filter(hasID(personID));
            let personFamily = person[0].families.filter(hasID(family.pointer));
            if (parentType == 'HUSB') {
              if (personFamily[0].pedi) {
                return personFamily[0].pedi.frel;
              } else if (relInfo.some(parent => parent.tag === "_FREL")) {
                return relInfo.find(parent => parent.tag === "_FREL").data;
              }
            } else {
              if (personFamily[0].pedi) {
                return personFamily[0].pedi.mrel;
              } else if (relInfo.some(parent => parent.tag === "_MREL")) {
                return relInfo.find(parent => parent.tag === "_MREL").data;
              }
            }
          }

          memberLinks.push({
            "source": memberSet[0].data,
            "target": memberSet[i].data,
            "sourceType": memberSet[0].tag,
            "targetType": memberSet[i].tag,
            "type": getPedigree(memberSet[i].data, memberSet[0].tag, memberSet[i].tree)
          })
        }
      }
    }
    memberSet.splice(0,1);
  }
  return memberLinks;
}

module.exports = d3ize;
