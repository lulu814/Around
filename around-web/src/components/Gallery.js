import React, {Component} from 'react';
import PropTypes from 'prop-types';
import GridGallery from 'react-grid-gallery';


class Gallery extends Component {
    static propTypes = {
        images: PropTypes.arrayOf(
            PropTypes.shape({
                // 类型校验
                user: PropTypes.string.isRequired,
                src: PropTypes.string.isRequired,
                thumbnail: PropTypes.string.isRequired,
                caption: PropTypes.string,
                thumbnailWidth: PropTypes.number.isRequired,
                thumbnailHeight: PropTypes.number.isRequired
            })
        ).isRequired
    }

    render() {
        const images = this.props.images.map((image) => {
            // add customOverlay to the image
            return {
                ...image,
                customOverlay: (
                    <div className="gallery-thumbnail">
                        <div>{`${image.user}: ${image.caption}`}</div>
                    </div>
                ),
            };
        });

        return (
            <div className="gallery">
                <GridGallery
                    //allow user exit by backdrop 点进去后退出
                    backdropClosesModal
                    images={images}
                    // disable Image Selection
                    enableImageSelection={false}/>
            </div>
        );
    }
}


export default Gallery;