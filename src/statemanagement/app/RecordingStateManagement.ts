import { saveRecording } from "./HistoryStateManagement";
import { resetGuidingState } from "./GuidingStateManagement";
import { lineToPolygon } from "../../helpers/utils";
import { lineString, multiPolygon } from '@turf/helpers';
import computeArea from "@turf/area";

export enum RecordingStatus { Idle, Recording, Paused}

interface RecordingState {
    status: RecordingStatus
    recordedPositions: Array<Array<Array<number>>>
    area: number
    equipmentWidth: number
    dateStart: string

}

const getInitialState = (): RecordingState => {
    return {
        status: RecordingStatus.Idle,
        recordedPositions: [[]],
        area: 0.00,
        equipmentWidth: null,
        dateStart: null
    };
};


const SET_STATUS = 'Recording/SET_STATUS';
const ADD_RECORDED_POSITION = 'Recording/ADD_RECORDED_POSITION';
const PAUSE_RECORDING = 'Recording/PAUSE_RECORDING';
const SET_AREA = 'Recording/SET_AREA';
const INIT_RECORDING_METADATA = 'Recording/INIT_RECORDING_METADATA';
const RESET = 'Recording/RESET';

export function setStatus(status: RecordingStatus) {
    return {
        type: SET_STATUS,
        payload: status
    }
}

export function setArea(area) {
    return {
        type: SET_AREA,
        payload: area
    }
}

export function addRecordedPosition(position) {
    return {
        type: ADD_RECORDED_POSITION,
        payload: position
    }
}

export function resetRecordingState() {
    return {
        type: RESET
    }
}

export function initRecordingMetadata(dateStart, equipmentWidth) {
    return {
        type: INIT_RECORDING_METADATA,
        payload: {
            dateStart: dateStart,
            equipmentWidth: equipmentWidth
        }
    }
}

export function recordingOnNewPosition(newPosition) {
    return (dispatch, getState) => {
        // If is recording, add to history
        if(getState().recording.status === RecordingStatus.Recording) {
            dispatch(addRecordedPosition(newPosition));

            const traceAsPolygons = getState().recording.recordedPositions.map((positions) => {
                if(positions.length > 1) {
                    let linePositionHistory = lineString(positions);
                    // This doesn't work if line history contains duplicates
                    // Using this because turf buffer funciton isn't working properly for some reason
                    let traceAsPolygon = lineToPolygon(linePositionHistory, getState().recording.equipmentWidth)
                    return traceAsPolygon;
                }
            }).filter((polygon) => polygon !== undefined);

            if(traceAsPolygons.length > 0) {
                const traceAsMultiPolygon = multiPolygon(traceAsPolygons);
                // Area in ha
                const area = Math.round((computeArea(traceAsMultiPolygon) / 10000) * 100) / 100;
                dispatch(setArea(area));
            }
        }
    }
}

export function startRecording() {
    return (dispatch, getState) => {
        // get equipmentWidth
        const equipmentWidth = getState().guiding.equipmentWidth;
        // set metadata
        dispatch(initRecordingMetadata(new Date().toISOString(), equipmentWidth))
        dispatch(setStatus(RecordingStatus.Recording))
    }
}

export function pauseRecording() {
    return (dispatch) => {
        // set status
        dispatch(setStatus(RecordingStatus.Paused))
        dispatch({
            type: PAUSE_RECORDING
        })
    }
}

export function resumeRecording() {
    return (dispatch) => {
        // set status
        dispatch(setStatus(RecordingStatus.Recording))
    }
}

export function cancelRecording() {
    return (dispatch) => {
        dispatch(setStatus(RecordingStatus.Idle))
        // Reset state
        dispatch(resetRecordingState());
    }
}

export function stopRecordingAndSave() {
    return (dispatch, getState) => {
        dispatch(setStatus(RecordingStatus.Idle))
        // Save recording in history
        dispatch(saveRecording({
            dateStart: getState().recording.dateStart,
            dateEnd: new Date().toISOString(),
            area: getState().recording.area,
            trace: getState().recording.recordedPositions,
            equipmentWidth: getState().recording.equipmentWidth
        }))
        // Reset state
        dispatch(resetRecordingState());
        // Reset guiding
        dispatch(resetGuidingState());

    }
}



const recordingStateReducer = (
    state = getInitialState(),
    action: any
): RecordingState => {
    switch (action.type) {
        case INIT_RECORDING_METADATA: {
            return {
                ...state,
                dateStart: action.payload.dateStart,
                equipmentWidth: action.payload.equipmentWidth
            };
        }
        case ADD_RECORDED_POSITION: {
            if(state.recordedPositions.length > 1) {
                const newRecordedPositions = [
                    ...state.recordedPositions.slice(0, state.recordedPositions.length - 1),
                    state.recordedPositions[state.recordedPositions.length - 1].concat([action.payload])
                ]
                return {
                    ...state,
                    recordedPositions: newRecordedPositions
                };
            } else {
                return {
                    ...state,
                    recordedPositions: [
                        state.recordedPositions[state.recordedPositions.length - 1].concat([action.payload])
                    ]
                };
            }
        }
        case PAUSE_RECORDING: {
            return {
                ...state,
                recordedPositions: [
                    ...state.recordedPositions,
                    []
                ]
            };
        }
        case SET_STATUS: {
            return {
                ...state,
                status: action.payload
            };
        }
        case SET_AREA: {
            return {
                ...state,
                area: action.payload
            };
        }
        case RESET: {
            return getInitialState()
        }
    }
    return state;
};

export default recordingStateReducer;