function initCurvedFolding(globals) {

    // class for halfedge
    class Vertex {
        constructor(point, id) {
            this._point = point;
            this._halfedge = null;
            this._id = id;
        }

        get point() {
            return this._point;
        }
        get halfedge() {
            return this._halfedge;
        }
        get id() {
            return this._id;
        }
        set point(point) {
            this._point = point;
        }
        set halfedge(halfedge) {
            this._halfedge = halfedge;
        }
    }

    class Halfedge {
        constructor(vertex) {
            this._vertex = vertex;
            this._face = null;
            this._pair = null;
            this._next = null;
            this._prev = null;
            this._isCurve = false;
            this._edge = null;
        }
        
        get vertex() {
            return this._vertex;
        }
        get face() {
            return this._face;
        }
        get pair() {
            return this._pair;
        }
        get next() {
            return this._next;
        }
        get prev() {
            return this._prev;
        }
        get isCurve() {
            return this._isCurve;
        }
        get edge() {
            return this._edge;
        }
        set vertex(vertex) {
            this._vertex = vertex;
        }
        set face(face) {
            this._face = face;
        }
        set pair(pair) {
            this._pair = pair;
        }
        set next(next) {
            this._next = next;
        }
        set prev(prev) {
            this._prev = prev;
        }
        set isCurve(isCurve) {
            this._isCurve = isCurve;
        }
        set edge(edge) {
            this._edge = edge;
        }
    }

    class Face {
        constructor(halfedge) {
            this._halfedge = halfedge;
        }

        get halfedge() {
            return this._halfedge;
        }
        set halfedge(halfedge) {
            this._halfedge = halfedge;
        }
    }

    class Edge {
        constructor(halfedge) {
            this._start = halfedge.vertex;
            this._end = halfedge.next.vertex;
            this._left = halfedge;
            this._right = null;
        }

        get start() {
            return this._start;
        }
        get end() {
            return this._end;
        }
        get left() {
            return this._left;
        }
        get right() {
            return this._right;
        }

        set right(halfedge) {
            this._right = halfedge;
        }
    }

    class Model {
        constructor(edges, assignments) {
            this._faces = [];
            this._vertices = [];
            this._edges = edges;
            this._assignments = assignments;
            this._virtices_edges;
            this._triangulated_edges = [];
        }

        setHalfedgePair(halfedge) {
            for (let i = 0; i < this._faces.length; i++) {
                let halfedgeInFace = this._faces[i].halfedge;
                do {
                    if (halfedge.vertex == halfedgeInFace.next.vertex && halfedge.next.vertex == halfedgeInFace.vertex) {
                        halfedge.pair = halfedgeInFace;
                        halfedgeInFace.pair = halfedge;
                        return;
                    }
                    halfedgeInFace = halfedgeInFace.next;
                } while (halfedgeInFace != this._faces[i].halfedge);
            }
        }

        setHalfedgePair2(halfedge0, halfedge1) {
            halfedge0.pair = halfedge1;
            halfedge0.isCurve = false;
            halfedge1.pair = halfedge0;
            halfedge1.isCurve = false;
        }

        checkIsCurved(halfedge) {
            for (let i = 0; i < this._edges.length; i++) {
                if (this._edges[i][0] == halfedge.vertex.id) {
                    if (this._edges[i][1] == halfedge.next.vertex.id) {
                        if (this._assignments[i] == 'CM' || this._assignments[i] == 'CV') {
                            halfedge.isCurve = true;
                        }
                    }
                } else if (this._edges[i][1] == halfedge.vertex.id) {
                    if (this._edges[i][0] == halfedge.next.vertex.id) {
                        if (this._assignments[i] == 'CM' || this._assignments[i] == 'CV') {
                            halfedge.isCurve = true;
                        }
                    }
                }
            }
        }

        addFace(vertex0, vertex1, vertex2) {
            let veMap = this._vertices_edges;
            let halfedge0 = new Halfedge(vertex0);
            if (vertex0.halfedge == null) {
                vertex0.halfedge = halfedge0;
            }
            let halfedge1 = new Halfedge(vertex1);
            if (vertex1.halfedge == null) {
                vertex1.halfedge = halfedge1;
            }
            let halfedge2 = new Halfedge(vertex2);
            if (vertex2.halfedge == null) {
                vertex2.halfedge = halfedge2;
            }
            
            halfedge0.next = halfedge1;
            halfedge0.prev = halfedge2;
            halfedge1.next = halfedge2;
            halfedge1.prev = halfedge0;
            halfedge2.next = halfedge0;
            halfedge2.prev = halfedge1;

            let face = new Face(halfedge0);
            this._faces.push(face);
            halfedge0.face = face;
            halfedge1.face = face;
            halfedge2.face = face;
            this.setHalfedgePair(halfedge0);
            this.setHalfedgePair(halfedge1);
            this.setHalfedgePair(halfedge2);

            if (halfedge0.pair == null) {
                let edge = new Edge(halfedge0);
                this._triangulated_edges.push(edge);
                halfedge0.edge = edge;
            } else {
                let edge = halfedge0.pair.edge;
                edge.right = halfedge0;
                halfedge0.edge = edge;
            }

            if (halfedge1.pair == null) {
                let edge = new Edge(halfedge1);
                this._triangulated_edges.push(edge);
                halfedge1.edge = edge;
            } else {
                let edge = halfedge1.pair.edge;
                edge.right = halfedge1;
                halfedge1.edge = edge;
            }

            if (halfedge2.pair == null) {
                let edge = new Edge(halfedge2);
                this._triangulated_edges.push(edge);
                halfedge2.edge = edge;
            } else {
                let edge = halfedge2.pair.edge;
                edge.right = halfedge2;
                halfedge2.edge = edge;
            }

            if (halfedge0.pair == null) {
                this.checkIsCurved(halfedge0);
            } else {
                if (veMap.has(vertex0.id)) {
                    veMap.set(vertex0.id, veMap.get(vertex0.id)+1);
                } else {
                    veMap.set(vertex0.id, 1);
                }
                if (veMap.has(vertex1.id)) {
                    veMap.set(vertex1.id, veMap.get(vertex1.id)+1);
                } else {
                    veMap.set(vertex1.id, 1);
                }
            }

            if (halfedge1.pair == null) {
                this.checkIsCurved(halfedge1);
            } else {
                if (veMap.has(vertex1.id)) {
                    veMap.set(vertex1.id, veMap.get(vertex1.id)+1);
                } else {
                    veMap.set(vertex1.id, 1);
                }
                if (veMap.has(vertex2.id)) {
                    veMap.set(vertex2.id, veMap.get(vertex2.id)+1);
                } else {
                    veMap.set(vertex2.id, 1);
                }
            }

            if (halfedge2.pair == null) {
                this.checkIsCurved(halfedge2);
            } else {
                if (veMap.has(vertex0.id)) {
                    veMap.set(vertex0.id, veMap.get(vertex0.id)+1);
                } else {
                    veMap.set(vertex0.id, 1);
                }
                if (veMap.has(vertex2.id)) {
                    veMap.set(vertex2.id, veMap.get(vertex2.id)+1);
                } else {
                    veMap.set(vertex2.id, 1);
                }
            }
        }

        cross(halfedge) {
            let vertexA = halfedge.vertex;
            let vertexB = halfedge.next.vertex;
            let vertexC = halfedge.prev.vertex;
            let vertexD = halfedge.pair.prev.vertex;
            let x1 = vertexA.point[0];
            let y1 = vertexA.point[1];
            let x2 = vertexB.point[0];
            let y2 = vertexB.point[1];
            let x3 = vertexC.point[0];
            let y3 = vertexC.point[1];
            let x4 = vertexD.point[0];
            let y4 = vertexD.point[1];

            let ta = (x3-x4)*(y1-y3)+(y3-y4)*(x3-x1);
            let tb = (x3-x4)*(y2-y3)+(y3-y4)*(x3-x2);
            let tc = (x1-x2)*(y3-y1)+(y1-y2)*(x1-x3);
            let td = (x1-x2)*(y4-y1)+(y1-y2)*(x1-x4);

            return (tc*td < 0) && (ta*tb < 0);
        }

        angle(a, b, c) {
            let X1 = b[0] - a[0];
            let Y1 = b[1] - a[1];
            let X2 = c[0] - a[0];
            let Y2 = c[1] - a[1];

            let lengthX = Math.pow(X1*X1+Y1*Y1, 0.5);
            let lengthY = Math.pow(X2*X2+Y2*Y2, 0.5);
            let cos = (X1*X2+Y1*Y2) / (lengthX*lengthY);
            let theta = Math.acos(cos);
            return theta;
        }

        cHalfedge1(tmpHalfedge) {
            if (tmpHalfedge.next.isCurve) {
                return tmpHalfedge.next;
            } else {
                if (tmpHalfedge.next.pair != null) {
                    return this.cHalfedge1(tmpHalfedge.next.pair);
                } else {
                    return false;
                }
            }
        }

        cHalfedge2(tmpHalfedge) {
            if (tmpHalfedge.prev.isCurve) {
                return tmpHalfedge.prev;
            } else {
                if (tmpHalfedge.prev.pair != null) {
                    return this.cHalfedge2(tmpHalfedge.prev.pair);
                } else {
                    return false;
                }
            }
        }

        cHalfedge3(tmpHalfedge) {
            if (tmpHalfedge.prev.isCurve) {
                return tmpHalfedge.prev;
            } else {
                if (tmpHalfedge.prev.pair != null) {
                    return this.cHalfedge3(tmpHalfedge.prev.pair);
                } else {
                    return false;
                }
            }
        }

        cHalfedge4(tmpHalfedge) {
            if (tmpHalfedge.next.isCurve) {
                return tmpHalfedge.next;
            } else {
                if (tmpHalfedge.next.pair != null) {
                    return this.cHalfedge4(tmpHalfedge.next.pair);
                } else {
                    return false;
                }
            }
        }

        cHalfedge5(tmpHalfedge) {
            if (tmpHalfedge.isCurve) {
                return tmpHalfedge;
            } else {
                if (tmpHalfedge.pair != null) {
                    return this.cHalfedge5(tmpHalfedge.pair.next);
                } else {
                    return false;
                }
            }
        }

        cHalfedge6(tmpHalfedge) {
            if (tmpHalfedge.isCurve) {
                return tmpHalfedge;
            } else {
                if (tmpHalfedge.pair != null) {
                    return this.cHalfedge6(tmpHalfedge.pair.prev);
                } else {
                    return false;
                }
            }
        }

        cHalfedge7(tmpHalfedge) {
            if (tmpHalfedge.isCurve) {
                return tmpHalfedge;
            } else {
                if (tmpHalfedge.pair != null) {
                    return this.cHalfedge7(tmpHalfedge.pair.prev);
                } else {
                    return false;
                }
            }
        }
        cHalfedge8(tmpHalfedge) {
            if (tmpHalfedge.isCurve) {
                return tmpHalfedge;
            } else {
                if (tmpHalfedge.pair != null) {
                    return this.cHalfedge8(tmpHalfedge.pair.next);
                } else {
                    return false;
                }
            }
        }

        orthogonal(halfedge) {
            let cHalfedge1 = null;
            let cHalfedge2 = null; 
            let cHalfedge3 = null;
            let cHalfedge4 = null;
            let cHalfedge5 = null;
            let cHalfedge6 = null; 
            let cHalfedge7 = null;
            let cHalfedge8 = null;

            let angleA1 = 0;
            let angleA2 = 0;
            let angleB1 = 0;
            let angleB2 = 0;
            let angleC1 = 0;
            let angleC2 = 0;
            let angleD1 = 0;
            let angleD2 = 0;

            let diffAngleA = null;
            let diffAngleB = null;
            let diffAngleC = null;
            let diffAngleD = null;

            cHalfedge1 = this.cHalfedge1(halfedge.pair);
            cHalfedge2 = this.cHalfedge2(halfedge);
            cHalfedge3 = this.cHalfedge3(halfedge.pair);
            cHalfedge4 = this.cHalfedge4(halfedge);
            cHalfedge5 = this.cHalfedge5(halfedge.pair.prev);
            cHalfedge6 = this.cHalfedge6(halfedge.pair.next);
            cHalfedge7 = this.cHalfedge7(halfedge.next);
            cHalfedge8 = this.cHalfedge8(halfedge.prev);

            if (cHalfedge1) {
                angleA1 = this.angle(halfedge.vertex.point, cHalfedge1.next.vertex.point, halfedge.next.vertex.point);
            }
            if (cHalfedge2) {
                angleA2 = this.angle(halfedge.vertex.point, cHalfedge2.vertex.point, halfedge.next.vertex.point);
            }
            if (cHalfedge1 && cHalfedge2) {
                diffAngleA = Math.pow(angleA1-angleA2, 2);
            }
            if (cHalfedge3) {
                angleB1 = this.angle(halfedge.next.vertex.point, cHalfedge3.vertex.point, halfedge.vertex.point);
            }
            if (cHalfedge4) {
                angleB2 = this.angle(halfedge.next.vertex.point, cHalfedge4.next.vertex.point, halfedge.vertex.point);
            }
            if (cHalfedge3 && cHalfedge4) {
                diffAngleB = Math.pow(angleB1-angleB2, 2);
            }
            if (cHalfedge5) {
                angleC1 = this.angle(halfedge.pair.prev.vertex.point, cHalfedge5.next.vertex.point, halfedge.prev.vertex.point);
            }
            if (cHalfedge6) {
                angleC2 = this.angle(halfedge.pair.prev.vertex.point, cHalfedge6.vertex.point, halfedge.prev.vertex.point);
            }
            if (cHalfedge5 && cHalfedge6) {
                diffAngleC = Math.pow(angleC1-angleC2, 2);
            }
            if (cHalfedge7) {
                angleD1 = this.angle(halfedge.prev.vertex.point, cHalfedge7.vertex.point, halfedge.pair.prev.vertex.point);
            }
            if (cHalfedge8) {
                angleD2 = this.angle(halfedge.prev.vertex.point, cHalfedge8.next.vertex.point, halfedge.pair.prev.vertex.point);
            }
            if (cHalfedge7 && cHalfedge8) {
                diffAngleD = Math.pow(angleD1-angleD2, 2);
            }

            if (diffAngleC && diffAngleD) {
                if (diffAngleA && diffAngleB) {
                    if (diffAngleA + diffAngleB > diffAngleC + diffAngleD) {
                        return diffAngleC + diffAngleD;
                    }
                } else if (!diffAngleA && !diffAngleB) {
                    return diffAngleC + diffAngleD;
                } else if (diffAngleA && !diffAngleB) {
                    if (diffAngleA * 2 > diffAngleC + diffAngleD) {
                        return diffAngleC + diffAngleD;
                    }
                } else if (!diffAngleA && diffAngleB) {
                    if (diffAngleB * 2 > diffAngleC + diffAngleD) {
                        return diffAngleC + diffAngleD;
                    }
                }
            } else if (diffAngleC && !diffAngleD) {
                if (!diffAngleA && !diffAngleB) {
                    return diffAngleC * 2;
                } else if (diffAngleA && diffAngleB) {
                    if (diffAngleA + diffAngleB > diffAngleC * 2) {
                        return diffAngleC * 2;
                    }
                } else if (diffAngleA && !diffAngleB) {
                    if (diffAngleA > diffAngleC) {
                        return diffAngleC * 2;
                    }
                } else if (!diffAngleA && diffAngleB) {
                    if (diffAngleB > diffAngleC) {
                        return diffAngleC * 2;
                    }
                }
            } else if (!diffAngleC && diffAngleD) {
                if (!diffAngleA && !diffAngleB) {
                    return diffAngleD * 2;
                } else if (diffAngleA & diffAngleB) {
                    if (diffAngleA + diffAngleB > diffAngleD * 2) {
                        return diffAngleD * 2;
                    }
                } else if (diffAngleA && !diffAngleB) {
                    if (diffAngleA > diffAngleD) {
                        return diffAngleD * 2;
                    }
                } else if (!diffAngleA && diffAngleB) {
                    if (diffAngleB > diffAngleD) {
                        return diffAngleD * 2;
                    }
                }
            }
            return 8100;
        }

        checkVertexNumber(halfedge) {
            let veMap = this._vertices_edges;
            if (veMap.get(halfedge.prev.vertex.id) >= 4) {
                return false;
            }
            if (veMap.get(halfedge.pair.prev.vertex.id) >= 4) {
                return false;
            }
            return true;
        }

        edgeSwap(halfedge) {// https://mitani.cs.tsukuba.ac.jp/lecture/jikken/polygon_operation.pdf

            let heLT = halfedge.prev.pair;
            if (heLT == null) {
                var dheLT = new Halfedge(halfedge.vertex);
                dheLT.edge = halfedge.prev.edge;
            }
            let heRT = halfedge.next.pair;
            if (heRT == null) {
                var dheRT = new Halfedge(halfedge.prev.vertex);
                dheRT.edge = halfedge.next.edge;
            }
            let heLB = halfedge.pair.next.pair;
            if (heLB == null) {
                var dheLB = new Halfedge(halfedge.pair.prev.vertex);
                dheLB.edge = halfedge.pair.next.edge;
            }
            let heRB = halfedge.pair.prev.pair;
            if (heRB == null) {
                var dheRB = new Halfedge(halfedge.pair.vertex);
                dheRB.edge = halfedge.pair.prev.edge;
            }

            if (heRB != null) {
                halfedge.next.vertex.halfedge = heRB;
            }
            if (heRT != null) {
                halfedge.prev.vertex.halfedge = heRT;
            }
            if (heLT != null) {
                halfedge.vertex.halfedge = heLT;
            }
            if (heLB != null) {
                halfedge.pair.prev.vertex.halfedge = heLB;
            }
            
            halfedge.vertex = heLB ? heLB.vertex : dheLB.vertex;
            halfedge.next.vertex = heRT ? heRT.vertex : dheRT.vertex;
            halfedge.prev.vertex = heLT ? heLT.vertex : dheLT.vertex;
            halfedge.pair.vertex = heRT ? heRT.vertex : dheRT.vertex;
            halfedge.pair.next.vertex = heLB ? heLB.vertex : dheLB.vertex;
            halfedge.pair.prev.vertex = heRB ? heRB.vertex : dheRB.vertex;

            halfedge.edge.start = halfedge.vertex;
            halfedge.edge.end = halfedge.pair.vertex;

            if (heLT != null) {
                this.setHalfedgePair2(heLT, halfedge.next);
                let edge = heLT.edge;
                edge.left = heLT;
                edge.right = halfedge.next;
                edge.start = heLT.vertex;
                edge.end = halfedge.next.vertex;
                halfedge.next.edge = edge;
            } else {
                halfedge.next.pair = null;
                halfedge.next.isCurve = false;
                this.checkIsCurved(halfedge.next);
                let edge = dheLT.edge;
                edge.left = halfedge.next;
                edge.right = null;
                edge.start = halfedge.next.vertex;
                edge.end = halfedge.next.next.vertex;
                halfedge.next.edge = edge;
            }
            if (heLB != null) {
                this.setHalfedgePair2(heLB, halfedge.prev);
                let edge = heLB.edge;
                edge.left = heLB;
                edge.right = halfedge.prev;
                edge.start = heLB.vertex;
                edge.end = halfedge.prev.vertex;
                halfedge.prev.edge = edge;
            } else {
                halfedge.prev.pair = null;
                halfedge.prev.isCurve = false;
                this.checkIsCurved(halfedge.prev);
                let edge = dheLB.edge;
                edge.left = halfedge.prev;
                edge.right = null;
                edge.start = halfedge.prev.vertex;
                edge.end = halfedge.prev.next.vertex;
                halfedge.prev.edge = edge;
            }
            if (heRT != null) {
                this.setHalfedgePair2(heRT, halfedge.pair.prev);
                let edge = heRT.edge;
                edge.left = heRT;
                edge.right = halfedge.pair.prev;
                edge.start = heRT.vertex;
                edge.end = halfedge.pair.prev.vertex;
                halfedge.pair.prev.edge = edge;
            } else {
                halfedge.pair.prev.pair = null;
                halfedge.pair.prev.isCurve = false;
                this.checkIsCurved(halfedge.pair.prev);
                let edge = dheRT.edge;
                edge.left = halfedge.pair.prev;
                edge.right = null;
                edge.start = halfedge.pair.prev.vertex;
                edge.end = halfedge.pair.prev.next.vertex;
                halfedge.pair.prev.edge = edge;
            }
            if (heRB != null) {
                this.setHalfedgePair2(heRB, halfedge.pair.next);
                let edge = heRB.edge;
                edge.left = heRB;
                edge.right = halfedge.pair.next;
                edge.start = heRB.vertex;
                edge.end = halfedge.pair.next.vertex;
                halfedge.pair.next.edge = edge;
            } else {
                halfedge.pair.next.pair = null;
                halfedge.pair.next.isCurve = false;
                this.checkIsCurved(halfedge.pair.next);
                let edge = dheRB.edge;
                edge.left = halfedge.pair.next;
                edge.right = null;
                edge.start = halfedge.pair.next.vertex;
                edge.end = halfedge.pair.next.next.vertex;
                halfedge.pair.next.edge = edge;
            }

            let veMap = this._vertices_edges;
            if (veMap.has(halfedge.vertex.id)) {
                veMap.set(halfedge.vertex.id, veMap.get(halfedge.vertex.id)+1);
            } else {
                veMap.set(halfedge.vertex.id, 1);
            }
            if (veMap.has(halfedge.next.vertex.id)) {
                veMap.set(halfedge.next.vertex.id, veMap.get(halfedge.next.vertex.id)+1);
            } else {
                veMap.set(halfedge.next.vertex.id, 1);
            }
            veMap.set(halfedge.prev.vertex.id, veMap.get(halfedge.prev.vertex.id)-1);
            veMap.set(halfedge.pair.prev.vertex.id, veMap.get(halfedge.pair.prev.vertex.id)-1);

            return true;
        }

        get vertices() {
            return this._vertices;
        }
        get faces() {
            return this._faces;
        }
        get verticesEdges() {
            return this._vertices_edges;
        }
        get triangulatedEdges() {
            return this._triangulated_edges;
        }

        set verticesEdges(array) {
            this._vertices_edges = array;
        }
    }

    function triangulatePolysForCurve(fold) {
        var vertices = fold.vertices_coords;
        var faces = fold.faces_vertices;
        var edges = fold.edges_vertices;
        var foldAngles = fold.edges_foldAngle;
        var assignments = fold.edges_assignment;
        var triangulatedFaces = [];
        for (var i=0;i<faces.length;i++){

            var face = faces[i];

            if (face.length == 3){
                triangulatedFaces.push(face);
                continue;
            }

            //check for quad and solve manually
            if (face.length == 4){
                var faceV1 = makeVector(vertices[face[0]]);
                var faceV2 = makeVector(vertices[face[1]]);
                var faceV3 = makeVector(vertices[face[2]]);
                var faceV4 = makeVector(vertices[face[3]]);
                var dist1 = (faceV1.clone().sub(faceV3)).lengthSq();
                var dist2 = (faceV2.clone().sub(faceV4)).lengthSq();
                if (dist2<dist1) {
                    edges.push([face[1], face[3]]);
                    foldAngles.push(0);
                    assignments.push("F");
                    triangulatedFaces.push([face[0], face[1], face[3]]);
                    triangulatedFaces.push([face[1], face[2], face[3]]);
                } else {
                    edges.push([face[0], face[2]]);
                    foldAngles.push(0);
                    assignments.push("F");
                    triangulatedFaces.push([face[0], face[1], face[2]]);
                    triangulatedFaces.push([face[0], face[2], face[3]]);
                }
                continue;
            }

            var faceEdges = [];
            for (var j=0;j<edges.length;j++){
                var edge = edges[j];
                if (face.indexOf(edge[0]) >= 0 && face.indexOf(edge[1]) >= 0){
                    faceEdges.push(j);
                }
            }

            var faceVert = [];
            for (var j=0;j<face.length;j++){
                var vertex = vertices[face[j]];
                faceVert.push(vertex[0]);
                faceVert.push(vertex[2]);
            }

            let cdt_points = [];
            for (let i = 0; i < faceVert.length-1; i+=2) {
                cdt_points.push([faceVert[i],faceVert[i+1]]);
            }

            let cdt_edges =[];
            for (let i = 0; i < faceVert.length/2-1; i++) {
                cdt_edges.push([i, i+1]);
            }
            cdt_edges.push([faceVert.length/2-1, 0]);

            let cdt2d = require('cdt2d');
            let cdt_result = cdt2d(cdt_points, cdt_edges, {exterior: false});

            let triangles = [];
            for (let i = 0; i < cdt_result.length; i++) {
                triangles.push(cdt_result[i][0]);
                triangles.push(cdt_result[i][1]);
                triangles.push(cdt_result[i][2]);
            }

            let model = new Model(edges, assignments);
            for (let i = 0; i < faceVert.length; i+=2) {
                let vertex = new Vertex([faceVert[i], faceVert[i+1]], face[i/2]);
                model.vertices.push(vertex);
            }
            model.verticesEdges = new Map();
            for (let i = 0; i < triangles.length; i+=3) {
                model.addFace(model.vertices[triangles[i]], model.vertices[triangles[i+1]], model.vertices[triangles[i+2]]);
            }

            let flag, repeat = 0;
            while (repeat < 1000) {
                flag = true;
                let minAngle = 8100;
                let edgeNum = -1;
                for (let index = 0; index < model.triangulatedEdges.length; index++) {
                    const edge = model.triangulatedEdges[index];
                    if (edge.left.pair != null) {
                        if (model.cross(edge.left)) {
                            if (model.checkVertexNumber(edge.left)) {
                                if (model.orthogonal(edge.left) < minAngle) {
                                    flag = false;
                                    minAngle = model.orthogonal(edge.left);
                                    edgeNum = index;
                                }
                            }
                        }
                    }
                }
                if (flag) {
                    break;
                } else {
                    model.edgeSwap(model.triangulatedEdges[edgeNum].left);
                }
                repeat++;
            }

            for (var j=0;j<triangles.length;j+=3){
                var tri = [face[triangles[j+2]], face[triangles[j+1]], face[triangles[j]]];
                var foundEdges = [false, false, false];//ab, bc, ca

                for (var k=0;k<faceEdges.length;k++){
                    var edge = edges[faceEdges[k]];

                    var aIndex = edge.indexOf(tri[0]);
                    var bIndex = edge.indexOf(tri[1]);
                    var cIndex = edge.indexOf(tri[2]);

                    if (aIndex >= 0){
                        if (bIndex >= 0) {
                            foundEdges[0] = true;
                            continue;
                        }
                        if (cIndex >= 0) {
                            foundEdges[2] = true;
                            continue;
                        }
                    }
                    if (bIndex >= 0){
                        if (cIndex >= 0) {
                            foundEdges[1] = true;
                            continue;
                        }
                    }
                }

                for (var k=0;k<3;k++){
                    if (foundEdges[k]) continue;
                    if (k==0){
                        faceEdges.push(edges.length);
                        edges.push([tri[0], tri[1]]);
                        foldAngles.push(0);
                        assignments.push("F");
                    } else if (k==1){
                        faceEdges.push(edges.length);
                        edges.push([tri[2], tri[1]]);
                        foldAngles.push(0);
                        assignments.push("F");
                    } else if (k==2){
                        faceEdges.push(edges.length);
                        edges.push([tri[2], tri[0]]);
                        foldAngles.push(0);
                        assignments.push("F");
                    }
                }

                triangulatedFaces.push(tri);
            }
        }
        fold.faces_vertices = triangulatedFaces;
        return fold;
    }

    return {
        triangulatePolysForCurve : triangulatePolysForCurve
    }
}