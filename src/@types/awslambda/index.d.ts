import { APIGatewayProxyEventV2, Context, Handler } from "aws-lambda";
import { Writable } from 'stream';

type Headers = {
  [header: string]: string | number;
}

type Metadata = {
  statusCode: number;
  headers: Headers;
}

global{
  declare namespace awslambda {
    export namespace HttpResponseStream {
      function from(writable: Writable, metadata: Metadata): Writable;
    }

    export type StreamifyHandler = (event: APIGatewayProxyEventV2, responseStream: Writable, context: Context) => Promise<any>;

    export function streamifyResponse(handler: StreamifyHandler) : Handler<any, any>;
  }
}
