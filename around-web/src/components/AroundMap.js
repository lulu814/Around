import React, {Component} from 'react';
import { POS_KEY } from '../constants';

import {
    withScriptjs,
    withGoogleMap,
    GoogleMap,
} from "react-google-maps";
import AroundMarker from "./AroundMarker";

class NormalAroundMap extends Component {
    // 拿到map instance
    getMapRef = (mapInstance) => {
        this.map = mapInstance;
        window.map = mapInstance;
    }

    reloadMarker = () => {
        // get location
        const center = this.getCenter();
        // get radius
        const radius = this.getRadius();
        //reload post --> call this.props.loadNearbyPosts 从子组件传到父组件
        this.props.loadNearbyPosts(center, radius);
    }

    getCenter() {
        const center = this.map.getCenter();
        return { lat: center.lat(), lon: center.lng() };
    }

    getRadius() {
        const center = this.map.getCenter();
        // google map下没有radius,用getBounds
        const bounds = this.map.getBounds();
        if (center && bounds) {
            const ne = bounds.getNorthEast();
            const right = new window.google.maps.LatLng(center.lat(), ne.lng());
            return 0.001 * window.google.maps.geometry.spherical.computeDistanceBetween(center, right);
        }
    }

    render() {
        const { lat, lon } = JSON.parse(localStorage.getItem(POS_KEY));
        return (
            <GoogleMap
                // 通过ref拿到google map
                ref={this.getMapRef}
                defaultZoom={11}
                defaultCenter={{ lat, lng: lon }}
                // 拖拽/zoom in-out会触发 reloadmarker
                onDragEnd={this.reloadMarker}
                onZoomChanged={this.reloadMarker}
            >
                {this.props.posts.map((post) => <AroundMarker post={post} key={post.url} />)}
            </GoogleMap>
        );
    }
}

//  to initialize the MyMapComponent with DOM instances, need to wrap it with withGoogleMap HOC
const AroundMap = withScriptjs(withGoogleMap(NormalAroundMap));

export default AroundMap;
