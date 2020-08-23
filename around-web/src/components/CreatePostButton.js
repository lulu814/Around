
import React, {Component} from 'react';
import { Modal, Button, message } from 'antd';
import { API_ROOT, AUTH_HEADER, TOKEN_KEY, POS_KEY } from '../constants';
import CreatePostForm from './CreatePostForm';


class CreatePostButton extends Component {
    state = {
        visible: false,
        confirmLoading: false,
    };
    // click --> modal visible turn to true
    showModal = () => {
        this.setState({
            visible: true,
        });
    };

    // reset the status (toggle)
    handleOk = () => {
        console.log('ok');
        this.form.validateFields((err, values) => {
            console.log(values);
            if (!err) {
                // 跟后端通信
                // url (token, position) + data (file) + send
                const token = localStorage.getItem(TOKEN_KEY);
                const { lat, lon } = JSON.parse(localStorage.getItem(POS_KEY));

                // file, data type: formData （构造函数）
                // 1. 在后端进行上传不需要刷新页面
                // 2. key/value pairs
                const formData = new FormData();
                formData.set('lat', lat);
                formData.set('lon', lon);
                formData.set('message', values.message);
                // image is array --?
                formData.set('image', values.image[0].originFileObj);

                this.setState({ confirmLoading: true });

                // fetch --> send file
                fetch(`${API_ROOT}/post`, {
                    method: 'POST',
                    headers: {
                        Authorization: `${AUTH_HEADER} ${token}`
                    },
                    body: formData,
                })
                    // .then get the response from back-end
                    .then((response) => {
                        if (response.ok) {
                            return this.props.loadNearbyPosts();
                        }
                        throw new Error('Failed to create post.');
                    })
                    .then(() => {
                        this.setState({ visible: false, confirmLoading: false });
                        // 上传成功后 resetFields 清空表单里的数据 (message + file)
                        this.form.resetFields();
                        message.success('Post created successfully!');
                    })
                    .catch((e) => {
                        console.error(e);
                        message.error('Failed to create post.');
                        this.setState({ confirmLoading: false });
                    });
            }
        });
    };


    // close the modal by clicking cancel
    handleCancel = () => {
        console.log('Clicked cancel button');
        this.setState({
            visible: false,
        });
    };


    getFormRef = (formInstance) => {
        this.form = formInstance;
    }

    render() {
        const { visible, confirmLoading } = this.state;
        return (
            <div>
                <Button type="primary" onClick={this.showModal}>
                    Create New Post
                </Button>
                <Modal
                    title="Create New Post"
                    visible={visible}
                    onOk={this.handleOk}
                    // "确定"/"创建" ok button上的文字
                    okText='Create'
                    confirmLoading={confirmLoading}
                    onCancel={this.handleCancel}
                >
                    {/*upload file through the form (HOC)*/}
                    {/*ref uncontrolled component --> 等用户上传完之后再获取，不需要实时更新数据*/}
                    <CreatePostForm ref={this.getFormRef}/>
                </Modal>
            </div>
        );
    }
}

export default CreatePostButton;
