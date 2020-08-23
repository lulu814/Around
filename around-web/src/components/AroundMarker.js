import React, {Component} from 'react';
import { Marker, InfoWindow } from 'react-google-maps';
import PropTypes from 'prop-types';
import blueMarker from '../assets/images/blue-marker.svg'

class AroundMarker extends Component {
    // 类型校验
    static propTypes = {
        post: PropTypes.object.isRequired
    }
    // window 开关
    state = {
        isOpen: false
    }

    // 控制开关
    handleToggle = () => {
        // 用回调函数， 先拿到之前状态 --> switch
        this.setState((prevState) => ({ isOpen: !prevState.isOpen }));
    }

    render() {
        const { user, message, url, location, type } = this.props.post;
        const { lat, lon } = location;
        const isImagePost = type === 'image';
        // add icon through url
        const customIcon = isImagePost ? undefined : {
            url: blueMarker,
            scaledSize: new window.google.maps.Size(26, 41),
        };

        return (
            <Marker
                position={{ lat, lng: lon }}
                onClick={isImagePost ? undefined: this.handleToggle}
                onMouseOver={isImagePost ? this.handleToggle : undefined }
                onMouseOut={isImagePost ? this.handleToggle : undefined }
                //传入icon动态的显示是image还是video
                icon={customIcon}
            >
                {
                    this.state.isOpen ?
                        (
                            <InfoWindow>
                                <div>
                                    {isImagePost
                                        ? <img src={url} alt={message} className="around-marker-image"/>
                                        : <video src={url} controls className="around-marker-video"/>}
                                    <p>{`${user}: ${message}`}</p>
                                </div>
                            </InfoWindow>
                        ) : null}
            </Marker>
        );
    }
}

export default AroundMarker;