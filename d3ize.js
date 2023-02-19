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

//from https://gka.github.io/palettes/#/150|s|51f0ed,32fa67,c9fc1e,fc1e1e|ffffe0,ff005e,93003a|1|1 
const getColor = (p, surnameList) => {

  const colorList = 
['#51f0ed', '#51f0eb', '#52f0e9', '#52f0e7', '#53f1e5', '#54f1e4', '#54f1e2', '#55f1e0', '#55f1de', '#56f1dc', '#56f1da', '#57f2d9', '#58f2d7', '#58f2d5', '#59f2d3', '#59f2d2', '#5af2d0', '#5bf2ce', '#5bf2cc', '#5cf2cb', '#5df3c9', '#5df3c7', '#5ef3c6', '#5ff3c4', '#60f3c2', '#60f3c1', '#61f3bf', '#62f3bd', '#63f3bc', '#63f3ba', '#64f3b9', '#65f3b7', '#66f4b5', '#67f4b4', '#68f4b2', '#68f4b1', '#69f4af', '#6af4ae', '#6bf4ac', '#6cf4ab', '#6df4a9', '#6ef4a8', '#6ef4a6', '#6ff4a5', '#70f4a3', '#71f4a2', '#72f4a0', '#73f49f', '#74f49d', '#75f49c', '#76f49b', '#77f499', '#78f398', '#79f396', '#7af395', '#7bf394', '#7cf392', '#7df391', '#7ef390', '#7ff38e', '#80f38d', '#81f38b', '#82f28a', '#83f289', '#84f288', '#85f286', '#86f285', '#87f284', '#88f182', '#89f181', '#8bf180', '#8cf17e', '#8df07d', '#8ef07c', '#8ff07b', '#90f079', '#91ef78', '#92ef77', '#93ef76', '#94ef74', '#96ee73', '#97ee72', '#98ee71', '#99ed70', '#9aed6e', '#9bed6d', '#9cec6c', '#9dec6b', '#9feb6a', '#a0eb69', '#a1ea67', '#a2ea66', '#a3ea65', '#a4e964', '#a5e963', '#a6e862', '#a8e861', '#a9e75f', '#aae75e', '#abe65d', '#ace55c', '#ade55b', '#aee45a', '#b0e459', '#b1e358', '#b2e257', '#b3e256', '#b4e155', '#b5e053', '#b6e052', '#b8df51', '#b9de50', '#badd4f', '#bbdd4e', '#bcdc4d', '#bddb4c', '#beda4b', '#bfda4a', '#c1d949', '#c2d848', '#c3d747', '#c4d646', '#c5d545', '#c6d444', '#c7d343', '#c8d242', '#c9d142', '#cad041', '#cbcf40', '#ccce3f', '#cdcd3e', '#cecc3d', '#d0cb3c', '#d1ca3b', '#d2c93a', '#d3c739', '#d4c639', '#d5c538', '#d6c437', '#d7c336', '#d8c135', '#d9c035', '#dabf34', '#dabd33', '#dbbc32', '#dcba31', '#ddb931', '#deb830', '#dfb62f', '#e0b52e', '#e1b32e', '#e2b22d', '#e3b02c', '#e4ae2c', '#e4ad2b', '#e5ab2a', '#e6a92a', '#e7a829', '#e8a629', '#e9a428', '#e9a228', '#eaa027', '#eb9e26', '#ec9d26', '#ec9b25', '#ed9925', '#ee9724', '#ee9424', '#ef9224', '#f09023', '#f08e23', '#f18c22', '#f28922', '#f28722', '#f38521', '#f38221', '#f48021', '#f57d20', '#f57a20', '#f67820', '#f67520', '#f7721f', '#f76f1f', '#f76c1f', '#f8691f', '#f8661f', '#f9631f', '#f95f1f', '#f95b1e', '#fa581e', '#fa541e', '#fa501e', '#fb4b1e', '#fb471e', '#fb421e', '#fb3c1e', '#fc361e', '#fc301e', '#fc281e', '#fc1e1e']

;



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
