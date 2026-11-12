import { describeLandmark, describePoster } from './landmarkChecks'

describeLandmark('easel')

// The canvas leans back on the easel a little, as a painting does, so it also reads from the district's view above.
describePoster('easel', { up: 0.1 })
