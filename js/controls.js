/**
 * Created by ghassaei on 10/7/16.
 */


function initControls(globals){

    $("#logo").mouseenter(function(){
        $("#activeLogo").show();
        $("#inactiveLogo").hide();
    });
    $("#logo").mouseleave(function(){
        $("#inactiveLogo").show();
        $("#activeLogo").hide();
    });

    setLink("#about", function(){
        $('#aboutModal').modal('show');
    });

    setLink("#exportSTL", function(){
        $('#exportSTLModal').modal('show');
    });

    setLink("#doSTLsave", function(){
        saveSTL();
    });


    setLink("#navPattern", function(){
        globals.navMode = "pattern";
        $("#navPattern").parent().addClass("open");
        $("#navSimulation").parent().removeClass("open");
        $("#svgViewer").show();
    });
    $("#navSimulation").parent().addClass("open");
    $("#navPattern").parent().removeClass("open");
    setLink("#navSimulation", function(){
        globals.navMode = "simulation";
        $("#navSimulation").parent().addClass("open");
        $("#navPattern").parent().removeClass("open");
        $("#svgViewer").hide();
    });

    setCheckbox("#dynamic", globals.simType == "dynamic", function(val){
        globals.simType = val;
    });
    setCheckbox("#static", globals.simType == "static", function(val){
        globals.simType = val;
    });
    setCheckbox("#schematic", globals.schematicVisible, function(val){
        globals.schematicVisible = val;
    });

    setRadio("simType", globals.simType, function(val){
        globals.simType = val;
    });

    setSliderInput("#axialStiffness", globals.axialStiffness, 1000, 4000, 1, function(val){
        globals.axialStiffness = val;
        globals.materialHasChanged = true;
    });

    setSliderInput("#creaseStiffness", globals.creaseStiffness, 0, 100, 1, function(val){
        globals.creaseStiffness = val;
        globals.creaseMaterialHasChanged = true;
    });

    setSliderInput("#panelStiffness", globals.panelStiffness, 0, 100, 1, function(val){
        globals.panelStiffness = val;
        globals.creaseMaterialHasChanged = true;
    });

    setSlider("#damping", globals.percentDamping, 0.05, 1, 0.01, function(val){
        globals.percentDamping = val;
    }, function(){
        globals.materialHasChanged = true;
        globals.shouldResetDynamicSim = true;
    });

    setSliderInput("#creasePercent", globals.creasePercent, -1, 1, 0.01, function(val){
        globals.creasePercent = val;
        globals.shouldChangeCreasePercent = true;
    });

    function setDeltaT(val){
        $("#deltaT").html(val.toFixed(4));
    }

    setLink("#resetDynamicSim", function(){
        globals.shouldResetDynamicSim = true;
    });

    setLink(".loadFile", function(e){
        $("#fileSelector").click();
        $(e.target).blur();
    });

    setLink(".demo", function(e){
        var url = $(e.target).data("url");
        if (url) {
            globals.pattern.loadSVG("assets/" + url);
        }
    });

    $("#fileSelector").change(function(e){
        var files = e.target.files; // FileList object
        if (files.length < 1) {
            console.warn("no files");
            return;
        }

        var file = files[0];
        var name = file.name;
        var extension = name.split(".");
        extension = extension[extension.length-1];
        var reader = new FileReader();

        if (extension == "txt"){
            reader.onload = function(){
                return function(e) {
                    if (!reader.result) return;
                    var json = JSON.parse(reader.result);

                    _.each(json.faceNodeIndices, function(face, i){
                        json.faceNodeIndices[i] = new THREE.Face3(face[0], face[1], face[2]);
                    });
                    var faces = json.faceNodeIndices;
                    var allCreaseParams = [];

                    for (var i=0;i<json.edges.length;i++){
                        var v1 = json.edges[i].vertices[0];
                        var v2 = json.edges[i].vertices[1];
                        var creaseParams = [];
                        for (var j=0;j<faces.length;j++){
                            var face = faces[j];
                            var faceVerts = [face.a, face.b, face.c];
                            var v1Index = faceVerts.indexOf(v1);
                            if (v1Index>=0){
                                var v2Index = faceVerts.indexOf(v2);
                                if (v2Index>=0){
                                    creaseParams.push(j);
                                    if (v2Index>v1Index) {
                                        faceVerts.splice(v2Index, 1);
                                        faceVerts.splice(v1Index, 1);
                                    } else {
                                        faceVerts.splice(v1Index, 1);
                                        faceVerts.splice(v2Index, 1);
                                    }
                                    creaseParams.push(faceVerts[0]);
                                    if (creaseParams.length == 4) {

                                        if (v2Index-v1Index == 1 || v2Index-v1Index == -2) {
                                            creaseParams = [creaseParams[2], creaseParams[3], creaseParams[0], creaseParams[1]];
                                        }

                                        creaseParams.push(i);
                                        var shouldSkip = false;

                                        switch (json.edges[i].type){
                                            case 0:
                                                //rule lines
                                                creaseParams.push(0);
                                                break;
                                            case 1:
                                                //quad panels
                                                creaseParams.push(null);//flag to set driven
                                                break;
                                            case 2:
                                                //outline
                                                shouldSkip = true;
                                                break;
                                            case 3:
                                                //crease
                                                creaseParams.push(Math.PI);
                                                break;
                                        }
                                        if (!shouldSkip) allCreaseParams.push(creaseParams);
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    _.each(json.nodes, function(node, i){
                        json.nodes[i] = new THREE.Vector3(node.x, node.y, node.z);
                    });

                    _.each(json.edges, function(edge, i){
                        json.edges[i] = [edge.vertices[0], edge.vertices[1]];
                    });
                    globals.model.buildModel(faces, json.nodes, json.edges, allCreaseParams);
                }
            }(file);
            reader.readAsText(file);
        } else if (extension == "svg"){
            reader.onload = function(){
                return function(e) {
                    globals.pattern.loadSVG(e.target.result);
                }
            }(file);
            reader.readAsDataURL(file);
        } else {
            console.warn("unknown extension: " + extension);
            return null;
        }

    });

    setCheckbox("#ambientOcclusion", globals.ambientOcclusion, function(val){
        globals.ambientOcclusion = val;
    });

    if (globals.colorMode == "color") $("#coloredMaterialOptions").show();
    else $("#coloredMaterialOptions").hide();
    setRadio("colorMode", globals.colorMode, function(val){
        globals.colorMode = val;
        if (val == "color") $("#coloredMaterialOptions").show();
        else $("#coloredMaterialOptions").hide();
        globals.model.setMeshMaterial();
    });

    setHexInput("#color1", globals.color1, function(val){
        globals.color1 = val;
        globals.model.setMeshMaterial();
    });
    setHexInput("#color2", globals.color2, function(val){
        globals.color2 = val;
        globals.model.setMeshMaterial();
    });

    setCheckbox("#edgesVisible", globals.edgesVisible, function(val){
        globals.edgesVisible = val;
        globals.model.updateEdgeVisibility();
    });

    setCheckbox("#meshVisible", globals.meshVisible, function(val){
        globals.meshVisible = val;
        globals.model.updateMeshVisibility();
        if (globals.meshVisible) $("#meshMaterialOptions").show();
        else $("#meshMaterialOptions").hide();
    });

    function setButtonGroup(id, callback){
        $(id+" a").click(function(e){
            e.preventDefault();
            var $target = $(e.target);
            var val = $target.data("id");
            if (val) {
                $(id+" span.dropdownLabel").html($target.html());
                callback(val);
            }
        });
    }

    function setLink(id, callback){
        $(id).click(function(e){
            e.preventDefault();
            callback(e);
        });
    }

    function setRadio(name, val, callback){
        $("input[name=" + name + "]").on('change', function() {
            var state = $("input[name="+name+"]:checked").val();
            callback(state);
        });
        $(".radio>input[value="+val+"]").prop("checked", true);
    }

    function setInput(id, val, callback, min, max){
        var $input = $(id);
        $input.change(function(){
            var val = $input.val();
            if ($input.hasClass("int")){
                if (isNaN(parseInt(val))) return;
                val = parseInt(val);
            } else {
                if (isNaN(parseFloat(val))) return;
                val = parseFloat(val);
            }
            if (min !== undefined && val < min) val = min;
            if (max !== undefined && val > max) val = max;
            $input.val(val);
            callback(val);
        });
        $input.val(val);
    }

    function setHexInput(id, val, callback){
        var $input = $(id);
        $input.css({"border-color": "#" + val});
        $input.change(function(){
            var val = $input.val();
            var validHex  = /(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i.test(val);
            if (!validHex) return;
            $input.val(val);
            $input.css({"border-color": "#" + val});
            callback(val);
        });
        $input.val(val);
    }

    function setCheckbox(id, state, callback){
        var $input  = $(id);
        $input.on('change', function () {
            if ($input.is(":checked")) callback(true);
            else callback(false);
        });
        $input.prop('checked', state);
    }

    function setSlider(id, val, min, max, incr, callback, callbackOnStop){
        var slider = $(id).slider({
            orientation: 'horizontal',
            range: false,
            value: val,
            min: min,
            max: max,
            step: incr
        });
        slider.on("slide", function(e, ui){
            var val = ui.value;
            callback(val);
        });
        slider.on("slidestop", function(){
            var val = slider.slider('value');
            if (callbackOnStop) callbackOnStop(val);
        })
    }

    function setLogSliderInput(id, val, min, max, incr, callback){

        var scale = (Math.log(max)-Math.log(min)) / (max-min);

        var slider = $(id+">div").slider({
            orientation: 'horizontal',
            range: false,
            value: (Math.log(val)-Math.log(min)) / scale + min,
            min: min,
            max: max,
            step: incr
        });

        var $input = $(id+">input");
        $input.change(function(){
            var val = $input.val();
            if ($input.hasClass("int")){
                if (isNaN(parseInt(val))) return;
                val = parseInt(val);
            } else {
                if (isNaN(parseFloat(val))) return;
                val = parseFloat(val);
            }

            var min = slider.slider("option", "min");
            if (val < min) val = min;
            if (val > max) val = max;
            $input.val(val);
            slider.slider('value', (Math.log(val)-Math.log(min)) / scale + min);
            callback(val, id);
        });
        $input.val(val);
        slider.on("slide", function(e, ui){
            var val = ui.value;
            val = Math.exp(Math.log(min) + scale*(val-min));
            $input.val(val.toFixed(4));
            callback(val, id);
        });
    }

    function setSliderInput(id, val, min, max, incr, callback){

        var slider = $(id+">div").slider({
            orientation: 'horizontal',
            range: false,
            value: val,
            min: min,
            max: max,
            step: incr
        });

        var $input = $(id+">input");
        $input.change(function(){
            var val = $input.val();
            if ($input.hasClass("int")){
                if (isNaN(parseInt(val))) return;
                val = parseInt(val);
            } else {
                if (isNaN(parseFloat(val))) return;
                val = parseFloat(val);
            }

            var min = slider.slider("option", "min");
            if (val < min) val = min;
            if (val > max) val = max;
            $input.val(val);
            slider.slider('value', val);
            callback(val);
        });
        $input.val(val);
        slider.on("slide", function(e, ui){
            var val = ui.value;
            $input.val(val);
            callback(val);
        });
    }

    function update(){
        function setInput(id, val){
            $(id).val(val);
        }
    }

    return {
        update:update,
        setDeltaT: setDeltaT
    }
}

