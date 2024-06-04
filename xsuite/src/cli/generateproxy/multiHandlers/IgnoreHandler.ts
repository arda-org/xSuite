import { AbstractMultiValueHandler } from "./AbstractMultiValueHandler";

export class IgnoreHandler extends AbstractMultiValueHandler {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _encode(_inputName: string, _toEncode: string): string {
    return "";
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _decode(_multiValueStartIndex: number, _toDecode: string): string {
    return "undefined;";
  }
}
