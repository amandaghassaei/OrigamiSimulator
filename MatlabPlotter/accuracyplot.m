plot(accuracy(:,1),accuracy(:,2))
hold on
plot(accuracy(:,1),accuracy(:,3))
plot(accuracy(:,1),accuracy(:,4))
plot(accuracy(:,1),accuracy(:,5))
legend('crease 1','crease 2', 'crease 3', 'crease 4')
hold off
save accuracy