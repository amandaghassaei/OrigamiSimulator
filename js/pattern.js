/**
 * Created by amandaghassaei on 2/25/17.
 */

function initPattern(globals){

    var SVGloader = new THREE.SVGLoader();

    function loadSVG(url, callback){

        SVGloader.load(url, callback, function(){}, function(error){
            alert("Error loading SVG: " + url);
            console.log(error);
        });

    }

    loadSVG("/assets/Tessellations/miura-ori-dashed.svg", function(doc){
        $("#svgViewer").html(doc);
        console.log(doc);
    });

    return {
        loadSVG: loadSVG
    }
}