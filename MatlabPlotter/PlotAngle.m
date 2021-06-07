%Jacob Pelster
%This program takes in an oragami simulator fold series, plots it with
%values to select, plots the selected angles over time (fold percent) and
%reanimates with the selected creases highlighted.
%If you have a vertex geometry with four creases, and angles between
%each crease alpha, beta, pi-alpha, pi-beta respectively, then you can
%compare the section to the explicit solution for a rigid four crease
%intersection.

close all
clearvars

data="4Crease70Fold Series_0to100by1.fold";

compare_to_four_crease_explicit=1;
do_animate_initial=1;
include_text=1;
plot_all_angles=0;


structure=jsondecode(fileread(data));
%This extracts the fold angle into a 2D array with crease index as the rows
%and frame number as the columns
f=[structure.file_frames.edges_crease_angle_os];

%This section preassigns the color and linestyle for plotting. (It was
%originally in the for loop, it doesn't seem to affect efficiency very much
%when moved outside.)
fold_type=structure.edges_assignment;
color_array=zeros(1,size(structure.edges_vertices,1));
color_array(strcmp("B",fold_type))=1;
color_array(strcmp("M",fold_type))=2;
color_array(strcmp("V",fold_type))=3;
face_selector=color_array==0;
color_array(face_selector)=1;
%color_sel={'k','r','b'};
color_sel='krb';

linestyle_array=ones(1,size(structure.edges_vertices,1));
linestyle_array(face_selector)=2;
linestyle_sel='-:'; %May need to change to cell depending on linestyles.

color=color_sel(color_array);
linestyles=linestyle_sel(linestyle_array);

% if(do_animate_initial)
%     figure
%     axis equal
%     view(3)
%     for x=1:size([structure.file_frames],1)
%         hold on
%         
%         tic
%         
%         for i=1:size(structure.edges_vertices,1)
%               
%               
% %             
% %             if (strcmp(fold_type(i),"B"))
% %                 color='k';
% %                 linestyles= '-';
% %             elseif (strcmp(fold_type(i),"M"))
% %                 color='r';
% %                 linestyles= '-';
% %             elseif (strcmp(fold_type(i),"V"))
% %                 color='b';
% %                 linestyles= '-';
% %             else 
% %                color='k';
% %                linestyles=':';
% %             end
% 
%             %Find vertice coordinates for the current crease angle.
%             first=structure.edges_vertices(i,1)+1;
%             xf=structure.file_frames(x).vertices_coords(first,1);
%             yf=structure.file_frames(x).vertices_coords(first,2);
%             zf=structure.file_frames(x).vertices_coords(first,3);
%             second=structure.edges_vertices(i,2)+1;
%             xs=structure.file_frames(x).vertices_coords(second,1);
%             ys=structure.file_frames(x).vertices_coords(second,2);
%             zs=structure.file_frames(x).vertices_coords(second,3);
% 
%             h(i)=plot3([xf,xs],[yf,ys],[zf,zs],'color',color(i),'linestyle',linestyles(i));
% 
%             if(include_text)
%                 %Include line number for selecting what creases to analyze
%                 texts(i)=text((xf+xs)/2,(yf+ys)/2,(zf+zs)/2*1.1,num2str(i));
%             end
%         end
% 
%         toc
%         hold off
%         drawnow
%         for i=1:size(structure.edges_vertices,1)
%            delete(h(i));
%             if(include_text)
%                 delete(texts(i));
%             end
%         end
% 
%     end
% end

if(do_animate_initial)
    figure
    axis equal
    view(3)
    for x=1:1:size([structure.file_frames],1)
        hold on
        
        
        tic
        
        for i=1:size(structure.edges_vertices,1)

            %Find vertice coordinates for the current crease angle.
            first=structure.edges_vertices(i,1)+1;
            fi=[structure.file_frames(x).vertices_coords(first,:)];
            second=structure.edges_vertices(i,2)+1;
            s=[structure.file_frames(x).vertices_coords(second,:)];
            
            
            
            h(i)=plot3([fi(1),s(1)],[fi(2),s(2)],[fi(3),s(3)],'color',color(i),'linestyle',linestyles(i));

            if(include_text)
                %Include line number for selecting what creases to analyze
                texts(i)=text((fi(1)+s(1))/2,(fi(2)+s(2))/2,(fi(3)+s(3))/2*1.1,num2str(i));
            end
        end
        
        for i=1:size(structure.faces_vertices,1)

            %Find vertice coordinates for the current crease angle.
            first=structure.faces_vertices(i,1)+1;
            fcoords=[structure.file_frames(x).vertices_coords(first,:)];
            second=structure.faces_vertices(i,2)+1;
            scoords=[structure.file_frames(x).vertices_coords(second,:)];
            third=structure.faces_vertices(i,3)+1;
            tcoords=[structure.file_frames(x).vertices_coords(third,:)];
            light_dir=[0 0 -1];
            v1=[tcoords(1)-fcoords(1),tcoords(2)-fcoords(2),tcoords(3)-fcoords(3)];
            v2=[scoords(1)-fcoords(1),scoords(2)-fcoords(2),scoords(3)-fcoords(3)];
            normal=cross(v1,v2);
            fraction=(dot(normal,light_dir)/(norm(normal)*norm(light_dir))+1)/2;
            hsv=rgb2hsv([1 0 0]);
            hsvlow=rgb2hsv([0 0 1]);
            small=0.0001;
            fi=fcoords-normal*small;
            s=scoords-normal*small;
            t=tcoords-normal*small;
            
            hsv(3)=hsv(3)*(fraction+1)/2;
            hsvlow(3)=hsvlow(3)*(fraction+1)/2;
            rgb=hsv2rgb(hsv);
            rgblow=hsv2rgb(hsvlow);
            
            g(i)=fill3([fcoords(1),scoords(1),tcoords(1)],[fcoords(2),scoords(2),tcoords(2)],[fcoords(3),scoords(3),tcoords(3)],rgb,'EdgeColor','none','FaceAlpha',0.9);
            lower(i)=fill3([fi(1),s(1),t(1)],[fi(2),s(2),t(2)],[fi(3),s(3),t(3)],rgblow,'EdgeColor','none','FaceAlpha',0.7);
        end

        toc
        hold off
        drawnow
        for i=1:size(structure.edges_vertices,1)
           delete(h(i));
            if(include_text)
                delete(texts(i));
            end
        end
        for j=1:size(structure.faces_vertices,1)
            delete(g(j))
            delete(lower(j))
        end

    end
end

fprintf("\n");
if plot_all_angles==0
    sel=[input("Please input which edges you would like to select. This should be matlab matrix format.\n")];
    for i=1:length(sel)
        for j=2:length(f(sel(i),:))
            if abs(f(sel(i),j)-f(sel(i),j-1))>270
                f(sel(i),j)=sign(f(sel(i),j-1))*(360-abs(f(sel(i),j)));
            end
        end

    end
else
    sel=1:1:size(f,1);
end

if(compare_to_four_crease_explicit)
    edges=[input("Please input the edges that are creases. This should be matlab matrix format in the counter-clockwise direction.\n")];
    for i=1:length(edges)
        for j=2:length(f(edges(i),:))
            if abs(f(edges(i),j)-f(edges(i),j-1))>270
                f(edges(i),j)=sign(f(edges(i),j-1))*(360-abs(f(edges(i),j)));
            end
        end
        

    end
end
%sel=strsplit(sel_string);



figure
hold on
for i=1:length(sel)
    plot([structure.file_frames.fold_percent_os],f(sel(i),:))
    %plot([structure.file_frames.fold_percent_os],f(sel(i),:),'color',color(i))
    
end
legendstr = cellstr(num2str(sel', 'edge %-d'));
legend(legendstr)
xlabel("Fold Percent")
ylabel("Angle between face normals (degrees)")
title('Angle Selection Plot')
hold off


if(compare_to_four_crease_explicit)
    figure
    hold on
    for i=1:length(edges)
        plot([structure.file_frames.fold_percent_os],f(edges(i),:))

    end
    legendstr = cellstr(num2str(edges', 'edge %-d'));
    legend(legendstr)
    xlabel("Fold Percent")
    ylabel("Angle between face normals")
    title("4 vertex edge angle plot")
    hold off
    
    %This section uses the explicit solution of a four crease vertex with
    %angles alpha,beta,pi-alpha,pi-beta, in that order.
    %T=[tan(p0)/2,tan(p1)/2,tan(p2)/2,tan(p3)/2]'=
    %mode 1: [t,-pt,t,pt]'
    %mode 2: [qt,t,-qt,t]'
    %where p=(1-tan(alpha/2)*tan(beta/2))/(1+tan(alpha/2)*tan(beta/2))
    %and q==(tan(alpha/2)-tan(beta/2))/(tan(alpha/2)+tan(beta/2))
    %Where t is a parameter, and p0 is the angle from pi-beta->alpha, whith
    %the index increasing in counterclockwise order of angles.
    
    %Tachi, T., and Hull, T. C. (March 9, 2017). 
    %"Self-Foldability of Rigid Origami." ASME. J. Mechanisms Robotics. 
    %April 2017; 9(2): 021008.
    %Equations 4,5,6
    
    idxes=zeros(3,2);
    for i=1:3
        %find what vertex indexes are of the edges selected
        idxes(i,:)=structure.edges_vertices(edges(i),:);
    end
    %The origin is the vertex that all creases have in common
    origin_idx=intersect(intersect(idxes(1,:),idxes(2,:)),idxes(3,:));
    origin_val=structure.file_frames(1).vertices_coords(origin_idx+1,:);
    
    endp_val=zeros(3,3);
    vector=zeros(3,3);
    for i=1:3
        %The point that is not the origin is the tip of a vector from the origin.
        endp_val(i,:)=structure.file_frames(1).vertices_coords(setdiff(idxes(i,:),origin_idx)+1,:);
        vector(i,:)=endp_val(i,:)-origin_val;
    end
    %Alpha and Beta are the angle between the first and second and second
    %and third vectors.
    alpha=acos(dot(vector(1,:),vector(2,:))/(norm(vector(1,:))*norm(vector(2,:))));
    beta=acos(dot(vector(2,:),vector(3,:))/(norm(vector(2,:))*norm(vector(3,:))));
    
    p=(1-tan(alpha/2)*tan(beta/2))/(1+tan(alpha/2)*tan(beta/2));
    q=(tan(alpha/2)-tan(beta/2))/(tan(alpha/2)+tan(beta/2));
    
    %We convert from angle to the parameterized vector since we cannot
    %convert from the parameterized vector to fold percent (an ill-defined
    %based solely on geometry value) for comparison
    num_steps=size([structure.file_frames],1);
    T=zeros(4,num_steps);
    for i=1:4
        T(i,:)=tan(f(edges(i),:)*pi/180/2);
    end
    t1=T(1,:);
    t1comp=T(3,:);
    npt=T(2,:);
    pt=T(4,:);
    t2=T(2,:);
    
    %some small values of t can be the opposite sign of the majority.
    %Plotting positive values is usually easier on a semilog plot
    if(mean(t1)<0)
        t1=-t1;
        t1(t1<0)=NaN;
    elseif(mean(t1)>0)
        t1(t1<0)=NaN;
    else

       error("The mean of t1 is zero, this shouldn't happen")
    end
    
    
    if(mean(t2)<0)
        t2=-t2;
        t2(t2<0)=NaN;
    elseif(mean(t2)>0)
        t2(t2<0)=NaN;
    else

       error("The mean of t1 is zero, this shouldn't happen")
    end
    
    %t_num=5000;
    %t_m1=logspace(log10(t1(2)),log10(t1(end)),t_num);
    t_m1=t1;
    t_m2=t2;
    %Define the modes based on the t values extracted from the simulation.
    mode1=zeros(4,num_steps);
    mode1(1,:)=2*atan(t_m1);
    mode1(2,:)=2*atan(-p*t_m1);
    mode1(3,:)=2*atan(t_m1);
    mode1(4,:)=2*atan(p*t_m1);
    %t_m2=logspace(log10(t2(2)),log10(t2(end)),t_num);
    mode2=zeros(4,num_steps);
    mode2(1,:)=2*atan(q*t_m2);
    mode2(2,:)=2*atan(t_m2);
    mode2(3,:)=2*atan(-q*t_m2);
    mode2(4,:)=2*atan(t_m2);
    
    sim_angle=zeros(4,num_steps);
    for i=1:4
        sim_angle(i,:)=-f(edges(i),:)*pi/180;
    end
    mode1_sq_sum=0;
    mode2_sq_sum=0;
    for j=1:size(mode1,2)
        if ~isnan(mode1(:,j))
            mode1_sq_sum=(sim_angle(:,j)-mode1(:,j)).^2+mode1_sq_sum;
        end
    end
    for j=1:size(mode2,2)
        if ~isnan(mode2(:,j))
            mode2_sq_sum=(sim_angle(:,j)-mode2(:,j)).^2+mode2_sq_sum;
        end
    end
    mode1_error=mode1_sq_sum/length(edges);
    mode2_error=mode2_sq_sum/length(edges);
%     mode1_error=sum((sim_angle-mode1).^2,2)/length(edges)
%     mode2_error=sum((sim_angle-mode2).^2,2)/length(edges)
    mode_save_switch=sum(mode1_error)>sum(mode2_error); %0 if mode1 is less than, 1 otherwise
    angle=input("Input angle of alpha and beta\n");
    if isfile('accuracy.txt')
        header_switch=0;
    else
        header_switch=1;
    end
    textdata = fopen('accuracy.txt','a');
    if header_switch
        fprintf(textdata,'angle, alpha, beta, pi-alpha, pi-beta\n\n');
    end
    if (mode_save_switch)
        er=mode2_error;
    else
        er=mode1_error;
    end
        
    fprintf(textdata,'%f,%f,%f,%f,%f\n',angle,er(1),er(2),er(3),er(4));
    fclose(textdata);
    type accuracy.txt
    
    figure
    legendstringset=cell(0);
    hold on
    for i=1:4
        plot(t_m1,mode1(i,:))
        
       
        plot(t1,-f(edges(i),:)*pi/180,'--')

        legendstringa=cellstr(num2str(edges(i),'edge theory %d'));
        legendstringb=cellstr(num2str(edges(i),'edge sim %d'));
        legendstringset=[legendstringset;legendstringa;legendstringb];
    end
    set(gca, 'XScale','log')
    title('Mode 1 theory vs simulation wrt t')
    xlabel('t (parameter defined in paper)')
    ylabel('angle (rad)')
    %legendstringa=cellstr(num2str(edges', 'edge theory %-d'));
    %legendstringb=cellstr(num2str(edges', 'edge simulation %-d'));
    %legendstring=[legendstringa;legendstringb];
    legend(legendstringset)
    hold off
    
   
    figure
    hold on
    for i=1:4
        plot(t_m2,mode2(i,:))
        

        plot(t2,-f(edges(i),:)*pi/180,'--');
        
    end
    set(gca, 'XScale','log')
    title('Mode 2 theory vs simulation wrt t')
    xlabel('t (parameter defined in paper)')
    ylabel('angle (rad)')
    legend(legendstringset)
    hold off
    
    
    figure
    pause
   
end


figure
view(3)
for x=1:size([structure.file_frames],1)
    hold on
    axis equal
    
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



