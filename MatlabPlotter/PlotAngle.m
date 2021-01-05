
close all
clearvars
data="simpleVertex _ 60PercentFolded (2).fold";
upper=jsondecode(fileread(data));
sel=12;


f=[upper.fold_percent.edges_crease_angle];
figure
scatter([upper.fold_percent.fold_percent],f(sel,:))


figure

for x=1:size(upper.fold_percent,1)
    hold on

    view(3)
    for i=1:size(upper.fold_percent(x).edges_vertices,1)
        
        color='b';
        if i==sel
            color='r';
        end
        first=upper.fold_percent(x).edges_vertices(i,1)+1;
        xf=upper.fold_percent(x).vertices_coords(first,1);
        yf=upper.fold_percent(x).vertices_coords(first,2);
        zf=upper.fold_percent(x).vertices_coords(first,3);
        second=upper.fold_percent(x).edges_vertices(i,2)+1;
        xs=upper.fold_percent(x).vertices_coords(second,1);
        ys=upper.fold_percent(x).vertices_coords(second,2);
        zs=upper.fold_percent(x).vertices_coords(second,3);
        h(i)=plot3([xf,xs],[yf,ys],[zf,zs],'color',color)
    end
    
    hold off
    pause(1)
    for i=1:size(upper.fold_percent(x).edges_vertices,1)
       delete(h(i)) 
    end
    
end
