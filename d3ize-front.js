// Tag search function
function hasTag(val) {
  return function(node) {
    return node.tag === val;
  };
}

// Tag search function
function hasData(val) {
  return function(node) {
    return node.data === val;
  };
}

function d3ize(tree) {
  var peopleNodes = tree
    .filter(hasTag('INDI'))
    .map(toNode);
  var families = tree.filter(hasTag('FAM'));
  //var familyNodes = families.map(toNode);
  var links = families.reduce(function(memo, family) {
    return memo.concat(familyLinks(family));
  }, []);
  var allNodes = peopleNodes;//.concat(familyNodes);
  var indexedNodes = allNodes.reduce(function(memo, node, i) {
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

// Get full name
function getName(p) {
  if (p.tag === 'INDI') {
    var nameNode = (p.tree.filter(hasTag('NAME')) || [])[0];
    if (nameNode) {
      return nameNode.data.replace(/\//g, '');
    } else {
      return '?';
    }
  } else {
    return 'Family';
  }
}

// Get first name
function getFirstName(p) {
  if (p.tag === 'INDI') {

    // Find 'NAME' tag
    var nameNode = (p.tree.filter(hasTag('NAME')) || [])[0];
    if (nameNode) {

      // Find 'GIVN' tag
      var firstNameNode = (nameNode.tree.filter(hasTag('GIVN')) || [])[0];
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
  } else {
    return 'Family';
  }
}

// Get surname
function getSurname(p) {
  if (p.tag === 'INDI') {

    // Find 'NAME' tag
    var nameNode = (p.tree.filter(hasTag('NAME')) || [])[0];
    if (nameNode) {

      // Find 'SURN' tag
      var surnameNode = (nameNode.tree.filter(hasTag('SURN')) || [])[0];
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
  } else {
    return 'Family';
  }
}

// Get gender
function getGender(p) {
  if (p.tag === 'INDI') {

    // Find 'SEX' tag
    var genderNode = (p.tree.filter(hasTag('SEX')) || [])[0];
    if (genderNode) {
      return genderNode.data;
    } else {
      return 'Unknown';
    }
  } else {
    return 'Unknown';
  }
}

// Get date of birth
function getDOB(p) {
  if (p.tag === 'INDI') {

    // Find 'BIRT' tag
    var dobNode = (p.tree.filter(hasTag('BIRT')) || [])[0];
    if (dobNode) {

      // Find 'DATE' tag
      var dateNode = (dobNode.tree.filter(hasTag('DATE')) || [])[0];
      if (dateNode) {
        return dateNode.data;
      } else {
        return '?';
      }
    } else {
      return '?';
    }
  }
}

// Get year of birth
function getYOB(p) {
  if (p.tag === 'INDI') {

    // Find 'BIRT' tag
    var dobNode = (p.tree.filter(hasTag('BIRT')) || [])[0];
    if (dobNode) {

      // Find 'DATE' tag
      var dateNode = (dobNode.tree.filter(hasTag('DATE')) || [])[0];
      if (dateNode) {
        return dateNode.data.slice(-4);
      } else {
        return '?';
      }
    } else {
      return '?';
    }
  }
}

// Get date of death
function getDOD(p) {
  if (p.tag === 'INDI') {

    // Find 'BIRT' tag
    var dodNode = (p.tree.filter(hasTag('DEAT')) || [])[0];
    if (dodNode) {

      // Find 'DATE' tag
      var dateNode = (dodNode.tree.filter(hasTag('DATE')) || [])[0];
      if (dateNode) {
        return dateNode.data;
      } else {
        return 'Unknown';
      }
    } else {
      return 'Present';
    }
  }
}

// Get year of death
function getYOD(p) {
  if (p.tag === 'INDI') {

    // Find 'BIRT' tag
    var dodNode = (p.tree.filter(hasTag('DEAT')) || [])[0];
    if (dodNode) {

      // Find 'DATE' tag
      var dateNode = (dodNode.tree.filter(hasTag('DATE')) || [])[0];
      if (dateNode) {
        return dateNode.data.slice(-4);
      } else {
        return 'Unknown';
      }
    } else {
      return 'Present';
    }
  }
}

// Get relatives
function getFamilies(p) {
  let families = [];
  if (p.tag === 'INDI') {
    var familyNode1 = (p.tree.filter(hasTag('FAMC')) || []);
    if (familyNode1) {
      for (let i = 0; i < familyNode1.length; i++) {
        families.push(familyNode1[i].data);
      }
    }
    var familyNode2 = (p.tree.filter(hasTag('FAMS')) || []);
    if (familyNode2) {
      for (let i = 0; i < familyNode2.length; i++) {
        families.push(familyNode2[i].data);
      }
    }
  }
  return families;
}

function toNode(p) {
  p.id = p.pointer;
  p.name = getName(p);
  p.firstName = getFirstName(p);
  p.surname = getSurname(p);
  p.gender = getGender(p);
  p.dob = getDOB(p);
  p.yob = getYOB(p);
  p.dod = getDOD(p);
  p.yod = getYOD(p);
  p.families = getFamilies(p);
  return p;
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

function familyLinks(family) {

  // Filter only individual objects from family tree
  var memberSet = family.tree.filter(function(member) {
    // avoid connecting MARR, etc: things that are not
    // people.
    return member.data && (member.data[1] === 'I' || member.data[1] === 'P');
  })

  var memberLinks = [];

  // Iterate over each member of set to connect with other members
  while (memberSet.length > 1) {
    for (var i = 1; i < memberSet.length; i++) {

      // Exclude sibling relationships
      if (memberSet[0].tag != 'CHIL')
      memberLinks.push({
        "source": memberSet[0].data,
        "target": memberSet[i].data,
        "sourceType": memberSet[0].tag,
        "targetType": memberSet[i].tag,
      })
    }
    memberSet.splice(0,1);
  }
  return memberLinks;
}

/*function familyLinksOld(family) {
    var memberLinks = family.tree.filter(function(member) {
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
