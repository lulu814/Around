import React from 'react';
import TopBar from './TopBar';
import Main from "./Main";
import {TOKEN_KEY} from "../constants";

class App extends React.Component {

    state = {
        isLoggedIn: Boolean(localStorage.getItem(TOKEN_KEY)),
    }

    handleLoginSucceed = (token) => {
        console.log('token --- ', token)
        // 获取token后写入browser localStorage
        localStorage.setItem(TOKEN_KEY, token);
        this.setState({ isLoggedIn: true });
    }

    handleLogout = () => {
        localStorage.removeItem(TOKEN_KEY);
        this.setState({ isLoggedIn: false });
    }


    render() {
        console.log(this.props)
        return (
            <div className="App">
                <TopBar handleLogout={this.handleLogout}
                        isLoggedIn={this.state.isLoggedIn}/>
                <Main
                    handleLoginSucceed={this.handleLoginSucceed}
                    isLoggedIn={this.state.isLoggedIn}
                />
            </div>
        )
    }
}
// function App() {
//   return (
//       <div className="App">
//         <TopBar />
//           <Main />
//       </div>
//   );
//
// }

export default App;
