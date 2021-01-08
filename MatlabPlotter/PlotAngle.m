
close all
clearvars
data="simpleVertex.fold";

structure=jsondecode(fileread(data));
sel=10;


f=[structure.file_frames.edges_crease_angle_os];
figure
scatter([structure.file_frames.fold_percent_os],f(sel,:))


figure

for x=1:size([structure.file_frames],1)
    hold on
    axis equal
    view(3)
    for i=1:size(structure.edges_vertices,1)
        
        color='b';
        if i==sel
            color='r';
        end
        first=structure.edges_vertices(i,1)+1;
        xf=structure.file_frames(x).vertices_coords(first,1);
        yf=structure.file_frames(x).vertices_coords(first,2);
        zf=structure.file_frames(x).vertices_coords(first,3);
        second=structure.edges_vertices(i,2)+1;
        xs=structure.file_frames(x).vertices_coords(second,1);
        ys=structure.file_frames(x).vertices_coords(second,2);
        zs=structure.file_frames(x).vertices_coords(second,3);
        h(i)=plot3([xf,xs],[yf,ys],[zf,zs],'color',color);
    end
    
    hold off
    pause(0.1)
    for i=1:size(structure.edges_vertices,1)
       delete(h(i));
    end
    
end
