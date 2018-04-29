import processing.pdf.*;

float edgeLength = 40;

void setup() {
  
  //20in*72dpi= 1440px
  size(600, 600,  PDF, "resch.pdf");
  background(255);
  
  pushMatrix();
  translate(edgeLength, edgeLength);
  int size = 10;
  for (int i=0;i<size;i++){
    for (int j=0;j<size;j++){
      pushMatrix();
      float yOffset = j*edgeLength*3.0/2.0;
      if (i%2==1) yOffset -= (edgeLength+edgeLength/2.0)/2.0;
      translate(i*edgeLength*3.0/4.0*sqrt(3), yOffset);
      drawTriangle();
      popMatrix();
    }
  }
  
  
  exit();
  
}

void drawTriangle(){
  stroke(255, 0, 0, 255.0/2.0);//50%
  line(0, -edgeLength, edgeLength/2*sqrt(3), edgeLength/2);
  line(0, -edgeLength, -edgeLength/2*sqrt(3), edgeLength/2);
  line(edgeLength/2*sqrt(3), edgeLength/2, 0, edgeLength/2);
  line(-edgeLength/2*sqrt(3), edgeLength/2, 0, edgeLength/2);
  
  stroke(255, 0, 0, 255.0/3.0);//33%
  line(0,0,edgeLength/4*sqrt(3), (-edgeLength+edgeLength/2)/2);
  line(0,0,-edgeLength/4*sqrt(3), (-edgeLength+edgeLength/2)/2);
  line(0,0,0,edgeLength/2);
  
  stroke(0, 0, 255);
  line(0, -edgeLength, 0, 0);
  line(0, 0, -edgeLength/2*sqrt(3), edgeLength/2);
  line(0, 0, edgeLength/2*sqrt(3), edgeLength/2);
}
