import { registerFloorGraph } from '../graphRegistry';
import { basementFloorGraphData } from '../basementFloorGraphData';
import { groundFloorGraphData }   from '../groundFloorGraphData';
import { firstFloorGraphData }    from '../firstFloorGraphData';
import { secondFloorGraphData }   from '../secondFloorGraphData';

registerFloorGraph(basementFloorGraphData);
registerFloorGraph(groundFloorGraphData);
registerFloorGraph(firstFloorGraphData);
registerFloorGraph(secondFloorGraphData);
