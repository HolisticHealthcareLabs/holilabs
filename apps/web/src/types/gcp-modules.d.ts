declare module '@google-cloud/secret-manager' {
  export class SecretManagerServiceClient {
    constructor(opts?: any);
    accessSecretVersion(request: any): Promise<any[]>;
  }
}

declare module '@google-cloud/storage' {
  export class Storage {
    constructor(opts?: any);
    bucket(name: string): any;
  }
}
