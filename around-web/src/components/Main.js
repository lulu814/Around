import React from 'react';
import { Register } from './Register';
import { Switch, Route, Redirect } from 'react-router-dom';
import { Login } from './Login';
import Home from './Home'

class Main extends React.Component {
    // case1: already login -> go to <Home>
    // case2: not login -> <Login />
    getLogin = () => {
        // redirect: override current location (不会停在main）
        return this.props.isLoggedIn ? <Redirect to="/home"/>
        // this.props 将handleLoginSucceed从App两层传递到login --> add token
            //在login中调用handleLoginSucceed
        : <Login handleLoginSucceed={this.props.handleLoginSucceed}/>
    }
    // case1: already login -> go to <Home>
    // case2: not login -> redirect to <Login />
    getHome = () => {
        return this.props.isLoggedIn ? <Home/> : <Redirect to="/login"/>
    }
    // path is the URL
    // default URL: <Route render={this.getLogin} /> 如果path都没有，会走到第四条
    render() {
        return (
            <div className="main">
                <Switch>
                    <Route path="/register" component={Register}/>
                    <Route path="/login" render={this.getLogin}/>
                    <Route path="/home" render={this.getHome} />
                    <Route render={this.getLogin} />
                </Switch>
            </div>
        );
    }
}

export default Main;
