/**
 * Created by amandaghassaei on 5/6/17.
 */


function initImporter(globals) {
  const reader = new FileReader();

  function makeVector2(v) {
    return new THREE.Vector2(v[0], v[1]);
  }
  function makeVector3(v) {
    return new THREE.Vector3(v[0], v[1], v[2]);
  }
  function makeVector(v) {
    if (v.length === 2) { return makeVector2(v); }
    return makeVector3(v);
  }

  function warnUnableToLoad() {
    globals.warn("Unable to load file.");
  }

  function importDemoFile(url) {
    let extension = url.split(".");
    let name = extension[extension.length - 2].split("/");
    name = name[name.length - 1];
    extension = extension[extension.length - 1];
    // globals.setCreasePercent(0);
    if (extension === "svg") {
      globals.url = url;
      globals.filename = name;
      globals.extension = extension;
      globals.pattern.loadSVG(`origamisimulator/assets/${url}`);
    } else {
      console.warn(`unknown extension: ${extension}`);
    }
  }

  $("#fileSelector").change((e) => {
    const files = e.target.files; // FileList object
    if (files.length < 1) {
      return;
    }

    const file = files[0];
    let extension = file.name.split(".");
    const name = extension[0];
    extension = extension[extension.length - 1];

    $(e.target).val("");

    if (extension === "svg") {
      reader.onload = (() => {
        return function (e) {
          if (!reader.result) {
            warnUnableToLoad();
            return;
          }
          $("#vertTol").val(globals.vertTol);
          $("#importSettingsModal").modal("show");
          $("#doSVGImport").click((e) => {
            e.preventDefault();
            $("#doSVGImport").unbind("click");
            globals.filename = name;
            globals.extension = extension;
            globals.url = null;
            globals.pattern.loadSVG(reader.result);
          });
        };
      })(file);
      reader.readAsDataURL(file);
    } else if (extension === "fold") {
      reader.onload = (() => {
        return function (e) {
          if (!reader.result) {
            warnUnableToLoad();
            return;
          }
          globals.filename = name;
          globals.extension = extension;
          globals.url = null;

          try {
            const fold = JSON.parse(reader.result);
            if (!fold || !fold.vertices_coords || !fold.edges_assignment || !fold.edges_vertices || !fold.faces_vertices) {
              globals.warn("Invalid FOLD file, must contain all of: <br/>" +
                "<br/>vertices_coords<br/>edges_vertices<br/>edges_assignment<br/>faces_vertices");
              return;
            }

            if (fold.edges_foldAngle) {
              globals.pattern.setFoldData(fold);
              return;
            }
            $("#importFoldModal").modal("show");
            $('#importFoldModal').on('hidden.bs.modal', () => {
              $('#importFoldModal').off('hidden.bs.modal');
              if (globals.foldUseAngles) { // todo this should all go to pattern.js
                globals.setCreasePercent(1);
                const foldAngles = [];
                for (let i = 0; i < fold.edges_assignment.length; i += 1) {
                  const assignment = fold.edges_assignment[i];
                  if (assignment === "F") foldAngles.push(0);
                  else foldAngles.push(null);
                }
                fold.edges_foldAngle = foldAngles;

                const allCreaseParams = globals.pattern.setFoldData(fold, true);
                let j = 0;
                const faces = globals.pattern.getTriangulatedFaces();
                for (let i = 0; i < fold.edges_assignment.length; i += 1) {
                  const assignment = fold.edges_assignment[i];
                  if (assignment !== "M" && assignment !== "V" && assignment !== "F") continue;
                  const creaseParams = allCreaseParams[j];
                  const face1 = faces[creaseParams[0]];
                  let vec1 = makeVector(fold.vertices_coords[face1[1]]).sub(makeVector(fold.vertices_coords[face1[0]]));
                  let vec2 = makeVector(fold.vertices_coords[face1[2]]).sub(makeVector(fold.vertices_coords[face1[0]]));
                  const normal1 = (vec2.cross(vec1)).normalize();
                  const face2 = faces[creaseParams[2]];
                  vec1 = makeVector(fold.vertices_coords[face2[1]]).sub(makeVector(fold.vertices_coords[face2[0]]));
                  vec2 = makeVector(fold.vertices_coords[face2[2]]).sub(makeVector(fold.vertices_coords[face2[0]]));
                  const normal2 = (vec2.cross(vec1)).normalize();
                  let angle = Math.abs(normal1.angleTo(normal2));
                  if (assignment == "M") angle *= -1;
                  fold.edges_foldAngle[i] = angle;
                  creaseParams[5] = angle;
                  j++;
                }
                globals.model.buildModel(fold, allCreaseParams);
                return;
              }
              const foldAngles = [];
              for (let i = 0; i < fold.edges_assignment.length; i += 1) {
                const assignment = fold.edges_assignment[i];
                if (assignment === "M") foldAngles.push(-Math.PI);
                else if (assignment === "V") foldAngles.push(Math.PI);
                else if (assignment === "F") foldAngles.push(0);
                else foldAngles.push(null);
              }
              fold.edges_foldAngle = foldAngles;
              globals.pattern.setFoldData(fold);
            });
          } catch (err) {
            globals.warn("Unable to parse FOLD json.");
            console.log(err);
          }
        };
      })(file);
      reader.readAsText(file);
    } else {
      globals.warn(`Unknown file extension: .${extension}`);
      return null;
    }
  });

  return {
    importDemoFile
  };
}

export default initImporter;
