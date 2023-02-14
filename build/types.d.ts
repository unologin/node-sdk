export type UserToken = {
    appId: string;
    asuId: string;
    userClasses: string[];
    iat: number;
    r?: number;
};
export type UserDocument<RequiredFields extends string = never> = {
    _id: string;
    appId: string;
    createdAt: string;
    profile: {
        [k in RequiredFields]: string;
    };
    requiredFields: RequiredFields[];
    userClasses: string[];
};
export type IUnologinClient = typeof import('./main');
