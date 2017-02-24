/**
 * Created by amandaghassaei on 2/24/17.
 */

//wireframe model and folding structure
function initModel(globals){

    var nodes = [];
    nodes.push(new Node(new THREE.Vector3(0,0,0), nodes.length));
    nodes.push(new Node(new THREE.Vector3(0,0,10), nodes.length));
    nodes.push(new Node(new THREE.Vector3(10,0,0), nodes.length));
    nodes.push(new Node(new THREE.Vector3(0,0,-10), nodes.length));
    nodes[0].setFixed(true);
    nodes[1].setFixed(true);
    nodes[2].setFixed(true);

    var edges = [];
    edges.push(new Beam([nodes[0], nodes[1]]));
    edges.push(new Beam([nodes[1], nodes[2]]));
    edges.push(new Beam([nodes[0], nodes[2]]));
    edges.push(new Beam([nodes[3], nodes[0]]));
    edges.push(new Beam([nodes[3], nodes[2]]));

    _.each(nodes, function(node){
        globals.threeView.sceneAddModel(node.getObject3D());
    });
    _.each(edges, function(edge){
        globals.threeView.sceneAddModel(edge.getObject3D());
    });

    function getNodes(){
        return nodes;
    }

    function getEdges(){
        return edges;
    }

    return {
        getNodes: getNodes,
        getEdges: getEdges
    }
}