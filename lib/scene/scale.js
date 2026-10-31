// Plan scale. The building is drawn 30 % more generous in plan than the measured renders:
// every x/z coordinate of the architecture (walls, slabs, rooms, site) is multiplied by S,
// while heights and the size of furniture and objects stay real. Change S to resize the plan.
export const S = 1.3;
export const sc = (v) => v * S;
