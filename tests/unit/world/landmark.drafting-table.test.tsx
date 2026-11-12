import { describeLandmark, describePoster } from './landmarkChecks'

describeLandmark('drafting-table')

// The board tilts well back toward the camera, so the design shows from above as well as from the front.
describePoster('drafting-table', { up: 0.5 })
