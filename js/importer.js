/**
 * Created by amandaghassaei on 5/6/17.
 */


function initImporter(globals){

    var reader = new FileReader();

    function importDemoFile(url){
        var extension = url.split(".");
        var name = extension[extension.length-2].split("/");
        name = name[name.length-1];
        extension = extension[extension.length-1];
        // globals.setCreasePercent(0);
        if (extension == "svg"){
            globals.url = url;
            globals.filename = name;
            globals.extension = extension;
            globals.pattern.loadSVG("assets/" + url, {vertexTol: globals.vertexTol});
        } else {
            console.warn("unknown extension: " + extension);
        }
    }

    $("#fileSelector").change(function(e) {
        var files = e.target.files; // FileList object
        if (files.length < 1) {
            return;
        }

        var file = files[0];
        var extension = file.name.split(".");
        var name = extension[0];
        extension = extension[extension.length - 1];

        $(e.target).val("");

        if (extension == "svg") {
            reader.onload = function () {
                return function (e) {
                    if (!reader.result) {
                        warnUnableToLoad();
                        return;
                    }
                    $("#vertexTol").val(globals.vertexTol);
                    $("#importSettingsModal").modal("show");
                    $('#doSVGImport').click(function (e) {
                        e.preventDefault();
                        $('#doSVGImport').unbind("click");
                        globals.filename = name;
                        globals.extension = extension;
                        globals.url = null;
                        globals.pattern.loadSVG(reader.result, {vertexTol: globals.vertexTol});
                    });
                }
            }(file);
            reader.readAsDataURL(file);
        } else if (extension == "fold"){
            reader.onload = function () {
                return function (e) {
                    if (!reader.result) {
                        warnUnableToLoad();
                        return;
                    }
                    globals.filename = name;
                    globals.extension = extension;
                    globals.url = null;

                    try {
                        var fold = JSON.parse(reader.result);
                        if (!fold || !fold.vertices_coords || !fold.edges_assignment || !fold.edges_vertices || !fold.faces_vertices) {
                            var msg = "Invalid FOLD file, must contain all of: <br/>" +
                                "<br/>vertices_coords<br/>edges_vertices<br/>edges_assignment<br/>faces_vertices";
                            globals.warn(msg);
                            return;
                        }

                        if (fold.edges_foldAngles) {
                            //todo add params
                            globals.pattern.loadFOLD(fold, {});
                            return;
                        }

                        $("#importFoldModal").modal("show");
                        $('#importFoldModal').on('hidden.bs.modal', function () {
                            $('#importFoldModal').off('hidden.bs.modal');
                            if (globals.foldUseAngles) {
                                globals.setCreasePercent(1);

                                globals.pattern.loadFOLD(fold, {calcFoldAnglesFromGeo: true});
                                return;
                            }

                            globals.pattern.loadFOLD(fold);
                        });


                    } catch(err) {
                        globals.warn("Unable to parse FOLD json.");
                        console.log(err);
                    }
                }
            }(file);
            reader.readAsText(file);
        } else {
            globals.warn('Unknown file extension: .' + extension);
            return null;
        }

    });

    function makeVector(v){
        if (v.length == 2) return makeVector2(v);
        return makeVector3(v);
    }
    function makeVector2(v){
        return new THREE.Vector2(v[0], v[1]);
    }
    function makeVector3(v){
        return new THREE.Vector3(v[0], v[1], v[2]);
    }

    function warnUnableToLoad(){
        globals.warn("Unable to load file.");
    }

    return {
        importDemoFile: importDemoFile
    }
}