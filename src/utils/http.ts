import qs from "qs";
import * as auth from "auth-provider";
import { useAuth } from "context/auth-context";
import { useCallback } from "react";

const apiUrl = process.env.REACT_APP_API_URL;

/**
 * Config继承了RequestInit的属性方法，同时还自定义了两个可选的属性token和data
 */
interface Config extends RequestInit {
  token?: string;
  data?: object;
}

/**
 * 封装http请求方法fetch
 * @param endpoint
 * @param data
 * @param token
 * @param headers
 * @param customConfig
 */
export const http = async (
  endpoint: string,
  { data, token, headers, ...customConfig }: Config = {}
) => {
  const config = {
    method: "GET",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": data ? "application/json" : ""
    },
    ...customConfig
  };

  if (config.method.toUpperCase() === "GET") {
    // 如果是GET请求，先构建路径参数
    endpoint += `?${qs.stringify(data)}`;
  } else {
    // 如果不是GET请求，就构建请求体
    config.body = JSON.stringify(data || {});
  }

  return window
    .fetch(`${apiUrl}/${endpoint}`, config)
    .then(async (response) => {
      if (response.status === 401) {
        // 如果状态码是401，在标准的RESTFul规范中，一般是指未登录或者token失效的状态，这个时候就需要重新登录。
        await auth.logout();
        // 退出之后，再重新刷新页面，重新登录
        window.location.reload();
        return Promise.reject({ message: "请重新登录" });
      }
      const data = await response.json();
      if (response.ok) {
        // 成功之后，返回数据
        return data;
      } else {
        // axios 和 fetch 的表现不一样，axios可以直接在返回状态不为2xx的时候抛出异常
        // 而fetch只会在极端情况（断网，网络连接失败）情况下才会抛出错误，这个概率非常小，所以我们需要手动抛出错误
        return Promise.reject(data);
      }
    });
};

// JS 中的typeof，是在runtime时运行的
// return typeof 1 === 'number'

// TS 中的typeof，是在静态环境运行的
// return (...[endpoint, config]: Parameters<typeof http>) =>

/**
 * 封装一个自动携带jwt的token的接口请求hook——useHttp，用来管理JWT和登录状态
 */
export const useHttp = () => {
  const { user } = useAuth();
  // utility type 的用法：用泛型给它传入一个其他类型，然后utility type对这个类型进行某种操作
  return useCallback(
    (...[endpoint, config]: Parameters<typeof http>) =>
      http(endpoint, { ...config, token: user?.token }),
    [user?.token]
  );
};

// 类型别名、Utility Type 讲解
// 联合类型
let myFavoriteNumber: string | number;
myFavoriteNumber = "seven";
myFavoriteNumber = 7;
// TS2322: Type '{}' is not assignable to type 'string | number'.
// myFavoriteNumber = {}
let jackFavoriteNumber: string | number;

// 类型别名在很多情况下可以和interface互换
// interface Person {
//   name: string
// }
// type Person = { name: string }
// const xiaoMing: Person = {name: 'xiaoming'}

// 但在下面两种情况下Interface无法替代type

// 1、类型别名, interface 在这种情况下没法替代type
type FavoriteNumber = string | number;
let roseFavoriteNumber: FavoriteNumber = "6";

// 2、interface 也没法实现Utility type
type Person = {
  name: string;
  age: number;
};
const xiaoMing: Partial<Person> = {};
const shenMiRen: Omit<Person, "name" | "age"> = {};
type PersonKeys = keyof Person;
type PersonOnlyName = Pick<Person, "name" | "age">;
type Age = Exclude<PersonKeys, "name">;

// Partial 的实现
type Partial<T> = {
  [P in keyof T]?: T[P];
};
