import { Tabs, Spin, Row, Col, Radio } from 'antd';
import React, {Component} from 'react';
import {
    GEO_OPTIONS,
    POS_KEY,
    API_ROOT,
    AUTH_HEADER,
    TOKEN_KEY,
    POST_TYPE_IMAGE,
    POST_TYPE_VIDEO,
    POST_TYPE_UNKNOWN,
    TOPIC_AROUND,
    TOPIC_FACE
} from '../constants'
import Gallery from './Gallery'
import CreatePostButton from "./CreatePostButton";
import AroundMap from './AroundMap';


const {TabPane} = Tabs; // or Tab.Pane

class Home extends Component {
    state = {
        isLoadingGeoLocation: false,
        isLoadingPosts: false,
        error: '',
        posts: [],
        topic: TOPIC_AROUND
    }

    // When the component is rendered to the DOM for the first time
    // such as at page load we call the Geolocation API to determine
    // a latitude and longitude for the browser
    componentDidMount() {
        console.log(navigator.geolocation);
        // fetch geolocation
        if ("geolocation" in navigator) {
            this.setState({isLoadingGeoLocation: true, error: ''});
            // BOM -> navigator -> geolocation
            navigator.geolocation.getCurrentPosition(
                this.onSuccessLoadGeoLocation,
                this.onFailedLoadGeoLocation,
                GEO_OPTIONS,
            );
        } else {
            this.setState({error: 'Geolocation is not supported.'});
        }
    }

    // store the location info in the localStorage
    onSuccessLoadGeoLocation = (position) => {
        console.log(position);
        const {latitude, longitude} = position.coords;
        //localStorage store key:value pair, only string
        localStorage.setItem(POS_KEY, JSON.stringify({lat: latitude, lon: longitude}));
        this.setState({isLoadingGeoLocation: false, error: ''});
        this.loadNearbyPosts();
    }

    onFailedLoadGeoLocation = () => {
        this.setState({isLoadingGeoLocation: false, error: 'Failed to load geo location.'});
    }
    //拿到geolocation之后立刻执行
    loadNearbyPosts = (center, radius) => {
        // convert string data to JSON
        const {lat, lon} = center ? center : JSON.parse(localStorage.getItem(POS_KEY));
        const range = radius ? radius : 20000; //default set to 20000, back end
        const token = localStorage.getItem(TOKEN_KEY);
        this.setState({isLoadingPosts: true, error: ''});
        // fetch URL + options
        fetch(`${API_ROOT}/search?lat=${lat}&lon=${lon}&range=${range}`, {
            method: 'GET',
            headers: {
                Authorization: `${AUTH_HEADER} ${token}`
            }
        })
            .then((response) => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Failed to load post.');
            })
            .then((data) => {
                console.log(data);
                this.setState({posts: data ? data : [], isLoadingPosts: false});
            })
            .catch((e) => {
                console.error(e);
                this.setState({isLoadingPosts: false, error: e.message});
            });
    }

    loadFacesAroundTheWorld = () => {
        const token = localStorage.getItem(TOKEN_KEY);
        // set stauts to loading
        this.setState({ isLoadingPosts: true, error: '' });
        // fetch data from server
        return fetch(`${API_ROOT}/cluster?term=face`, {
            method: 'GET',
            headers: {
                Authorization: `${AUTH_HEADER} ${token}`,
            }
        })
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Failed to load posts');
            })
            .then(data => {
                console.log(data);
                // set state posts
                this.setState({ posts: data ? data : [], isLoadingPosts: false });
            })
            .catch((e) => {
                console.error(e);
                this.setState({ isLoadingPosts: false , error: e.message });
            });
    }

    loadPostsByTopic = (center, radius) => {
        if (this.state.topic === TOPIC_AROUND) {
            return this.loadNearbyPosts(center, radius);
        } else {
            return this.loadFacesAroundTheWorld();
        }
    }

    renderImagePosts() {
        const {posts} = this.state;
        const images = posts
            .filter((post) => post.type === POST_TYPE_IMAGE)
            .map((post) => {
                return {
                    user: post.user,
                    src: post.url,
                    thumbnail: post.url,
                    caption: post.message,
                    thumbnailWidth: 400,
                    thumbnailHeight: 300,
                };
            });
        return <Gallery images={images}/>
    }

    renderVideoPosts() {
        const { posts } = this.state;
        return (
            <Row gutter={30}>
                {
                    posts
                        .filter((post) => [POST_TYPE_VIDEO, POST_TYPE_UNKNOWN].includes(post.type))
                        .map((post) => (
                            <Col span={6} key={post.url}>
                                <video src={post.url} controls={true} className="video-block"/>
                                <p>{post.user}: {post.message}</p>
                            </Col>
                        ))
                }
            </Row>
        );
    }

    // renderImagePosts() {
    //     const {error, isLoadingGeoLocation, isLoadingPosts, posts} = this.state;
    //     // case 1: has error
    //     if (error) {
    //         return error;
    //     }
    //     // case 2: if it is loading the geo location
    //     else if (isLoadingGeoLocation) {
    //         return <Spin tip="Loading geo location..."/>;
    //     }
    //     // case 3: loading posts
    //     else if (isLoadingPosts) {
    //         return <Spin tip="Loading posts..."/>
    //     }
    //         // case 4: have post already
    //     // thumbnail(preview) vs. src
    //     else if (posts.length > 0) {
    //         const images = posts.map((post) => {
    //             return {
    //                 user: post.user,
    //                 src: post.url,
    //                 thumbnail: post.url,
    //                 caption: post.message,
    //                 thumbnailWidth: 400,
    //                 thumbnailHeight: 300,
    //             };
    //         });
    //         return <Gallery images={images}/>
    //     } else {
    //         return 'No nearby posts';
    //     }
    // }

    // use one common render post to check error/loading
    renderPosts(type) {
        const {error, isLoadingGeoLocation, isLoadingPosts, posts} = this.state;
        if (error) {
            return error;
        } else if (isLoadingGeoLocation) {
            return <Spin tip="Loading geo location..."/>;
        } else if (isLoadingPosts) {
            return <Spin tip="Loading posts..."/>
        } else if (posts.length > 0) {
            return type === POST_TYPE_IMAGE ? this.renderImagePosts() : this.renderVideoPosts();
        } else {
            return 'No nearby posts';
        }
    }

    handleTopicChange = (e) => {
        // get current selected value
        const topic = e.target.value;

        // reset topic
        // { topic: topic }可简写成{ topic }
        this.setState({ topic: topic });
        // case 1: topic around -> load near by
        if (topic === TOPIC_AROUND) {
            this.loadNearbyPosts();
        } else {
            // case 2: face around -> load face around
            this.loadFacesAroundTheWorld();
        }
    }


    render() {
        // pass loadNearbyPosts to the create post button
        const operations = <CreatePostButton loadNearbyPosts={this.loadPostsByTopic}/>;

        return (
            <div>
                {/*radio button group to switch between*/}
                <Radio.Group onChange={this.handleTopicChange} value={this.state.topic}>
                    <Radio value={TOPIC_AROUND}>Posts Around Me</Radio>
                    <Radio value={TOPIC_FACE}>Faces Around The World</Radio>
                </Radio.Group>
                <Tabs tabBarExtraContent={operations} className="main-tabs">
                    <TabPane tab="Image Posts" key="1">
                        {this.renderPosts(POST_TYPE_IMAGE)}
                    </TabPane>
                    <TabPane tab="Video Posts" key="2">
                        {this.renderPosts(POST_TYPE_VIDEO)}
                    </TabPane>
                    <TabPane tab="Map" key="3">
                        <AroundMap
                            // google map API key
                            googleMapURL="https://maps.googleapis.com/maps/api/js?key=AIzaSyD3CEh9DXuyjozqptVB5LA-dN7MxWWkr9s&v=3.exp&libraries=geometry,drawing,places"
                            loadingElement={<div style={{ height: `100%` }} />}
                            containerElement={<div style={{ height: `600px` }} />}
                            mapElement={<div style={{ height: `100%` }} />}
                            posts={this.state.posts}
                            loadNearbyPosts={this.loadNearbyPosts}
                        />

                    </TabPane>
                </Tabs>

            </div>

        );

    }
}

export default Home;
