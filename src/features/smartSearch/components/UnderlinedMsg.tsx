import { Msg } from 'core/i18n';
import UnderlinedText from './UnderlinedText';
import {
  InterpolatedMessage,
  PlainMessage,
  ValueRecord,
} from 'core/i18n/messages';

type UnderlinedPlainMsgProps = {
  id: PlainMessage;
  values?: void;
};

type UnderlinedInterpolatedMsgProps<Values extends ValueRecord> = {
  id: InterpolatedMessage<Values>;
  values: Values;
};

type UnderlinedMsgProps<Values extends ValueRecord> =
  | UnderlinedInterpolatedMsgProps<Values>
  | UnderlinedPlainMsgProps;

function hasValues<Values extends ValueRecord>(
  props: UnderlinedMsgProps<Values>
): props is UnderlinedInterpolatedMsgProps<Values> {
  return props.values !== undefined;
}

function UnderlinedMsg(props: UnderlinedPlainMsgProps): JSX.Element;
function UnderlinedMsg<Values extends ValueRecord>(
  props: UnderlinedInterpolatedMsgProps<Values>
): JSX.Element;
function UnderlinedMsg<Values extends ValueRecord>(
  props: UnderlinedMsgProps<Values>
): JSX.Element {
  const text = hasValues(props) ? (
    <Msg id={props.id} values={props.values} />
  ) : (
    <Msg id={props.id} />
  );

  return <UnderlinedText text={text} />;
}

export default UnderlinedMsg;
