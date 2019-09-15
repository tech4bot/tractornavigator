import { GeolocationPosition, Plugins } from "@capacitor/core";
import { geopositionToObject } from "../../helpers/utils";
const { Geolocation } = Plugins;

interface GeolocationState {
    position: GeolocationPosition;
}

const getInitialState = (): GeolocationState => {
    return {
        position: {
            timestamp: undefined,
            coords: undefined
        }
    };
};


const SET_POSITION = 'Geolocation/SET_POSITION';
const GET_POSITION = 'Geolocation/GET_POSITION';

export function setPosition(position: GeolocationPosition) {
    return {
        type: SET_POSITION,
        payload: position
    }
}

export function getPosition() {
    return (dispatch) => {
        Geolocation.getCurrentPosition({
            timeout: 15000
        }).then((position) => {
            // Need to parse geoposition DOM element to normal object otherwise redux can't parse it
            // in reducer     
            dispatch(setPosition(geopositionToObject(position)));
        })
    }
}


const geolocationReducer = (
    state = getInitialState(),
    action: any
): GeolocationState => {
    switch (action.type) {
        case SET_POSITION: {
            return {
                ...state,
                position: action.payload
            };
        }
    }
    return state;
};

export default geolocationReducer;