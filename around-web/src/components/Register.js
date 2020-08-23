import React from 'react';
import {Form, Input, Button, message} from 'antd';
import { Link } from 'react-router-dom';
import { API_ROOT } from '../constants';

class RegistrationForm extends React.Component {
    state = {
        // if the confirm password has value
        confirmDirty: false,
        autoCompleteResult: [],
    };
    // submit
    handleSubmit = e => {
        // 防止点submit后发送一个http request 进行default refresh页面URL会变
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                console.log('Received values of form: ', values);
                // back end 接口, promise
                fetch(`${API_ROOT}/signup`, {
                    method: 'POST',
                    body: JSON.stringify({
                        username: values.username,
                        password: values.password,
                    }),
                })
                    .then((response) => {
                        if (response.ok) {
                            return response.text();
                        }
                        throw new Error(response.statusText);
                    })
                    .then((data) => {
                        console.log(data);
                        message.success('Registration succeed!');
                        // once register successful, jump to login
                        // history --> object, push调用方法
                        this.props.history.push('/login');
                    })
                    .catch((err) => {
                        console.error(err);
                        message.error('Registration failed.');
                    });
            }
        });
    };
    //!!value convert the value to True if has value
    // blur事件：光标移出
    handleConfirmBlur = e => {
        const {value} = e.target;
        this.setState({confirmDirty: this.state.confirmDirty || !!value});
    };
    // validate the password
    compareToFirstPassword = (rule, value, callback) => {
        const {form} = this.props;
        if (value && value !== form.getFieldValue('password')) {
            callback('Two passwords that you enter is inconsistent!');
        } else {
            callback();
        }
    };
    // validate the password
    // 输完confirm password 再回去输Password
    validateToNextPassword = (rule, value, callback) => {
        const {form} = this.props;
        if (value && this.state.confirmDirty) {
            // 强制比较
            // confirm --> id, do the real validation in validateFields
            form.validateFields(['confirm'], {force: true});
        }
        // callback must be called for all the validation
        callback();
    };

    render() {
        const {getFieldDecorator} = this.props.form;

        const formItemLayout = {
            labelCol: {
                xs: {span: 24},
                sm: {span: 8},
            },
            wrapperCol: {
                xs: {span: 24},
                sm: {span: 16},
            },
        };
        const tailFormItemLayout = {
            wrapperCol: {
                xs: {span: 24, offset: 0,},
                sm: {span: 16, offset: 8,},
            },
        };
        //getFieldDecorator: 给Input 加了ID eg:'username', 加了校验rule
        return (
            <Form {...formItemLayout} onSubmit={this.handleSubmit} className="register">
                <Form.Item label="Username">
                    {
                        getFieldDecorator('username', {
                            // 表单校验
                            rules:
                                [{required: true, message: 'Please input your username!'}],
                        })(<Input/>)}
                </Form.Item>

                <Form.Item label="Password" hasFeedback>
                    {
                        getFieldDecorator('password', {
                            rules: [
                                {
                                    required: true,
                                    message: 'Please input your password!',
                                },
                                {
                                    validator: this.validateToNextPassword,
                                },
                            ],
                            // 眼睛
                        })(<Input.Password/>)}
                </Form.Item>
                <Form.Item label="Confirm Password" hasFeedback>
                    {getFieldDecorator('confirm', {
                        rules: [
                            {
                                required: true,
                                message: 'Please confirm your password!',
                            },
                            {
                                validator: this.compareToFirstPassword,
                            },
                        ],
                        // 光标从这个form移走就强制进行比较
                    })(<Input.Password onBlur={this.handleConfirmBlur}/>)}
                </Form.Item>
                <Form.Item {...tailFormItemLayout}>
                    <Button type="primary" htmlType="submit">
                        Register
                    </Button>
                    <p>I already have an account, go back to <Link to="/login">login</Link></p>
                </Form.Item>
            </Form>
        );
    }
}

// hoc: higher order component --> form.create
// prop.form 是被包装后RegistrationForm的组件传入的object
export const Register = Form.create({name: 'register'})(RegistrationForm);
