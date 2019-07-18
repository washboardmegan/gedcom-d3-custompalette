// Tag search function
function hasTag(val) {
  return function(node) {
    return node.tag === val;
  };
}

// Data search function
function hasData(val) {
  return function(node) {
    return node.data === val;
  };
}

// ID search function
function hasID(val) {
  return function(node) {
    return node.id === val;
  };
}

function d3ize(tree) {
  let peopleNodes = tree
    .filter(hasTag('INDI'))
    .map(toNode);
  let notes = tree.filter(hasTag('NOTE'));
  // Add bio
  getBio(peopleNodes, notes);
  let families = tree.filter(hasTag('FAM'));
  //let familyNodes = families.map(toNode);
  let links = families.reduce(function(memo, family) {
    return memo.concat(familyLinks(family, peopleNodes));
  }, []);
  let allNodes = peopleNodes;//.concat(familyNodes);
  let indexedNodes = allNodes.reduce(function(memo, node, i) {
    memo[node.id] = i;
    return memo;
  }, {});
  //links = links.map(idToIndex(indexedNodes));
  return {
    nodes: peopleNodes,
    links: links,
    families: families
  };
}

// Get title
function getTitle(p) {

  let title = (p.tree.filter(hasTag('TITL')) || []);
  if (title.length > 0) {
    //console.log(title[title.length -1]);
    return title[title.length -1].data;
  }
}

// Get full name
function getName(p) {

  let nameNode = (p.tree.filter(hasTag('NAME')) || [])[0];
  if (nameNode) {
    return nameNode.data.replace(/\//g, '');
  } else {
    return '?';
  }
}

// Get first name
function getFirstName(p) {

  // Find 'NAME' tag
  let nameNode = (p.tree.filter(hasTag('NAME')) || [])[0];
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
function getSurname(p) {

  // Find 'NAME' tag
  let nameNode = (p.tree.filter(hasTag('NAME')) || [])[0];
  if (nameNode) {

    // Find 'SURN' tag
    let surnameNode = (nameNode.tree.filter(hasTag('SURN')) || [])[0];
    if (surnameNode) {

      // Remove alternate surnames
      if (surnameNode.data.search(',') !== -1) {
        return surnameNode.data.slice(0, surnameNode.data.search(','));
      } else {
        return surnameNode.data;
      }
    } else {
      return '?';
    }
  } else {
    return '?';
  }
}

// Get gender
function getGender(p) {

  // Find 'SEX' tag
  let genderNode = (p.tree.filter(hasTag('SEX')) || [])[0];
  if (genderNode) {
    return genderNode.data;
  } else {
    return 'Unknown';
  }
}

// Get date of birth
function getDOB(p) {

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
function getYOB(p) {

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
function getPOB(p) {

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
function getDOD(p) {

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
function getYOD(p) {
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
function getPOD(p) {

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

// Get notes
function getNotes(p) {
  let notes = p.tree.filter(hasTag('NOTE'));
  return notes;
}

// Get relatives
function getFamilies(p) {
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

function toNode(p) {
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
  p.notes = getNotes(p);
  p.families = getFamilies(p);
  return p;
}

// Get Bio
function getBio(person, notes) {

  // People
  for (let i = 0; i < person.length; i++) {
    if (person[i].notes.length != 0) {
      let bio = '';
      // Notes for person
      for (let j = 0; j < person[i].notes.length; j++) {

        // Go through all notes to compare
        for (let k = 0; k < notes.length; k++) {

          // Find matching note for person
          if (person[i].notes[j].data == notes[k].pointer) {
            bio += notes[k].data;

            // Concat broken up note
            if (notes[k].tree.length > 0) {
              for (let l = 0; l < notes[k].tree.length; l++) {
                bio += notes[k].tree[l].data;
              }
            }
          }
        }

      }
      person[i].bio = bio;
    }
  }
}

function idToIndex(indexedNodes) {
  return function(link) {
    function getIndexed(id) {
      return indexedNodes[id];
    }
    return {
      source: getIndexed(link.source),
      target: getIndexed(link.target)
    };
  };
}

function familyLinks(family, peopleNodes) {
  let memberLinks = [];
  let maritalStatus = null;
  let pedigree;

  // Filter only individual objects from family tree
  let memberSet = family.tree.filter(function(member) {
    // avoid connecting MARR, etc: things that are not
    // people.
    return member.data && (member.data[1] === 'I' || member.data[1] === 'P');
  })

  // Filter marital status events
  family.tree.filter(function(event) {
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
          function getPedigree(personID, parentType) {
            let person = peopleNodes.filter(hasID(personID));
            let personFamily = person[0].families.filter(hasID(family.pointer));
            if (parentType == 'HUSB') {
              if (personFamily[0].pedi) {
                return personFamily[0].pedi.frel;
              }
            } else {
              if (personFamily[0].pedi) {
                return personFamily[0].pedi.mrel;
              }
            }
          }

          memberLinks.push({
            "source": memberSet[0].data,
            "target": memberSet[i].data,
            "sourceType": memberSet[0].tag,
            "targetType": memberSet[i].tag,
            "type": getPedigree(memberSet[i].data, memberSet[0].tag)
          })
        }
      }
    }
    memberSet.splice(0,1);
  }
  return memberLinks;
}

/*function familyLinksOld(family) {
    let memberLinks = family.tree.filter(function(member) {
        // avoid connecting MARR, etc: things that are not
        // people.
        return member.data && member.data[0] === '@';
    }).map(function(member) {
        return {
            source: family.pointer,
            target: member.data
        };
    });
    return memberLinks;
}*/

//module.exports = d3ize;
