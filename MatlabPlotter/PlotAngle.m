
close all
clearvars
data="simpleVertex.fold";

structure=jsondecode(fileread(data));
sel=10;

f=[structure.file_frames.edges_crease_angle_os];


figure

for x=1:size([structure.file_frames],1)
    hold on
    axis equal
    view(3)
    for i=1:size(structure.edges_vertices,1)
        
        color='b';

        first=structure.edges_vertices(i,1)+1;
        xf=structure.file_frames(x).vertices_coords(first,1);
        yf=structure.file_frames(x).vertices_coords(first,2);
        zf=structure.file_frames(x).vertices_coords(first,3);
        second=structure.edges_vertices(i,2)+1;
        xs=structure.file_frames(x).vertices_coords(second,1);
        ys=structure.file_frames(x).vertices_coords(second,2);
        zs=structure.file_frames(x).vertices_coords(second,3);
        h(i)=plot3([xf,xs],[yf,ys],[zf,zs],'color',color);
        texts(i)=text((xf+xs)/2,(yf+ys)/2,(zf+zs)/2*1.1,num2str(i));
    end
    
    hold off
    pause(0.1)
    for i=1:size(structure.edges_vertices,1)
       delete(h(i));
       delete(texts(i));
    end
    
end
fprintf("\n");
sel=[input("Please input which edges you would like to select. This should be matlab matrix format.\n")];
%sel=strsplit(sel_string);

figure
hold on
for i=1:length(sel)
    plot([structure.file_frames.fold_percent_os],f(sel(i),:))
    
end
legendstr = cellstr(num2str(sel', 'sel=%-d'));
legend(legendstr)
xlabel("Fold Percent")
ylabel("Angle between face normals")
hold off
figure

for x=1:size([structure.file_frames],1)
    hold on
    axis equal
    view(3)
    for i=1:size(structure.edges_vertices,1)
        
        color='b';
        if ismember(i,sel)
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
        texts(i)=text((xf+xs)/2,(yf+ys)/2,(zf+zs)/2*1.1,num2str(i));
    end
    
    hold off
    pause(0.1)
    for i=1:size(structure.edges_vertices,1)
       delete(h(i));
       delete(texts(i));
    end
    
end
