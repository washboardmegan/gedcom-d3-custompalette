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

//from https://colordesigner.io/gradient-generator
const getColor = (p, surnameList) => {
  const colorList = 

  ['#ff3737', '#ff373a', '#ff373d', '#ff3741', '#ff3744', '#ff3747', '#ff374a', '#ff374d', '#ff3750', '#ff3754', '#ff3757', '#ff375a', '#ff375d', '#ff3760', '#ff3764', '#ff3767', '#ff376a', '#ff376d', '#ff3770', '#ff3773', '#ff3777', '#ff377a', '#ff377d', '#ff3780', '#ff3783', '#ff3787', '#ff378a', '#ff378d', '#ff3790', '#ff3793', '#ff3796', '#ff379a', '#ff379d', '#ff37a0', '#ff37a3', '#ff37a6', '#ff37aa', '#ff37ad', '#ff37b0', '#ff37b3', '#ff37b6', '#ff37b9', '#ff37bd', '#ff37c0', '#ff37c3', '#ff37c6', '#ff37c9', '#ff37cc', '#ff37d0', '#ff37d3', '#ff37d6', '#ff37d9', '#ff37dc', '#ff37e0', '#ff37e3', '#ff37e6', '#ff37e9', '#ff37ec', '#ff37ef', '#ff37f3', '#ff37f6', '#ff37f9', '#ff37fc', '#fd37fd', '#fa37fd', '#f737fd', '#f436fd', '#f136fd', '#ee36fd', '#eb36fd', '#e836fd', '#e536fd', '#e235fd', '#df35fd', '#dc35fd', '#d935fd', '#d635fd', '#d335fd', '#d034fc', '#cd34fc', '#ca34fc', '#c734fc', '#c434fc', '#c134fc', '#be34fc', '#bb33fc', '#b833fc', '#b533fc', '#b233fc', '#af33fc', '#ac33fc', '#a932fc', '#a632fc', '#a332fc', '#a032fc', '#9d32fc', '#9a32fc', '#9731fc', '#9431fc', '#9131fc', '#8e31fc', '#8b31fc', '#8831fc', '#8530fc', '#8230fc', '#7f30fc', '#7c30fc', '#7930fc', '#7630fc', '#732ffb', '#702ffb', '#6d2ffb', '#6a2ffb', '#672ffb', '#642ffb', '#612ffb', '#5e2efb', '#5b2efb', '#582efb', '#552efb', '#522efb', '#4f2efb', '#4c2dfb', '#492dfb', '#462dfb', '#452efb', '#4431fb', '#4434fb', '#4436fb', '#4339fb', '#433cfb', '#423efb', '#4241fb', '#4244fb', '#4146fb', '#4149fb', '#414bfb', '#404efb', '#4051fb', '#3f53fb', '#3f56fb', '#3f59fb', '#3e5bfb', '#3e5efb', '#3d61fb', '#3d63fb', '#3d66fb', '#3c69fb', '#3c6bfb', '#3c6efb', '#3b71fb', '#3b73fb', '#3a76fb', '#3a79fb', '#3a7bfb', '#397efb', '#3980fb', '#3883fb', '#3886fb', '#3888fb', '#378bfb', '#378efb', '#3790fb', '#3693fb', '#3696fb', '#3598fb', '#359bfb', '#359efb', '#34a0fb', '#34a3fb', '#33a6fb', '#33a8fb', '#33abfb', '#32aefb', '#32b0fb', '#32b3fb', '#31b6fb', '#31b8fb', '#30bbfb', '#30bdfb', '#30c0fb', '#2fc3fb', '#2fc5fb', '#2ec8fb', '#2ecbfb', '#2ecdfb', '#2dd0fb', '#2dd2fb', '#2dd3f9', '#2dd3f8', '#2dd4f7', '#2dd5f5', '#2dd5f4', '#2dd6f2', '#2dd7f1', '#2dd7f0', '#2dd8ee', '#2dd9ed', '#2dd9ec', '#2ddaea', '#2ddbe9', '#2ddbe8', '#2ddce6', '#2ddde5', '#2ddde3', '#2ddee2', '#2ddfe1', '#2ddfdf', '#2de0de', '#2de1dd', '#2de1db', '#2de2da', '#2de3d9', '#2de3d7', '#2de4d6', '#2de5d4', '#2de5d3', '#2de6d2', '#2de7d0', '#2de7cf', '#2de8ce', '#2de9cc', '#2de9cb', '#2deaca', '#2debc8', '#2debc7', '#2decc5', '#2dedc4', '#2dedc3', '#2deec1', '#2deec0', '#2defbf', '#2df0bd', '#2df0bc', '#2df1ba', '#2df2b9', '#2df2b8', '#2df3b6', '#2df4b5', '#2df4b4', '#2df5b2', '#2df6b1', '#2df6b0', '#2df7ae', '#2df8ad', '#2df8ab', '#2df9aa', '#2dfaa9', '#2dfaa7', '#2dfba6']
  
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
