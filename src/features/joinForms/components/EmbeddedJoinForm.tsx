'use server';

import { headers } from 'next/headers';

import { EmbeddedJoinFormData } from 'features/joinForms/types';
import { CUSTOM_FIELD_TYPE, ZetkinUser } from 'utils/types/zetkin';
import BackendApiClient from 'core/api/client/BackendApiClient';
import { getBrowserLanguage } from 'utils/locale';
import getServerMessages from 'core/i18n/server';
import globalMessageIds from 'core/i18n/messageIds';
import embeddingMessageIds from 'features/joinForms/l10n/messageIds';

export type Props = {
  encrypted: string;
  fields: EmbeddedJoinFormData['fields'];
  orgId: string;
  stylesheet?: string;
};

export const renderJoinForm = async ({
  encrypted,
  fields,
  orgId,
  stylesheet,
}: Props) => {
  const headersList = headers();
  const headersEntries = headersList.entries();
  const headersObject = Object.fromEntries(headersEntries);
  const apiClient = new BackendApiClient(headersObject);

  let user: ZetkinUser | null;
  try {
    user = await apiClient.get<ZetkinUser>('/api/users/me');
  } catch (e) {
    user = null;
  }

  const lang =
    user?.lang || getBrowserLanguage(headers().get('accept-language') || '');
  const [globalMessages, embeddingMessages] = await Promise.all([
    getServerMessages(lang, globalMessageIds),
    getServerMessages(lang, embeddingMessageIds),
  ]);

  return (
    <form
      action={`/o/${orgId}/embedjoinform/submit${
        stylesheet ? `?stylesheet=${encodeURIComponent(stylesheet)}` : ''
      }`}
      method={'POST'}
    >
      <input name="__joinFormData" type="hidden" value={encrypted} />

      {fields.map((field) => {
        const isCustom = 'l' in field;
        const isEnum =
          isCustom && field.t === CUSTOM_FIELD_TYPE.ENUM && 'e' in field;
        const label = isCustom
          ? field.l
          : globalMessages.personFields[field.s]();

        if (isEnum) {
          return (
            <div key={field.s} className="zetkin-joinform__field">
              <label htmlFor={field.s}>{label}</label>
              <br />
              <select id={field.s} name={field.s}>
                {field.e.map((v) => (
                  <option key={v.key} value={v.key}>
                    {v.key}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        return (
          <div key={field.s} className="zetkin-joinform__field">
            <label>
              {label}
              <div>
                {field.s !== 'gender' && (
                  <input
                    className="zetkin-joinform__text-input"
                    name={field.s}
                    required={
                      field.s === 'first_name' || field.s === 'last_name'
                    }
                    type="text"
                  />
                )}

                {field.s === 'gender' && (
                  <select name={field.s}>
                    <option value="unspecified">
                      {globalMessages.genderOptions.unspecified()}
                    </option>
                    <option value="m">
                      {globalMessages.genderOptions.m()}
                    </option>
                    <option value="f">
                      {globalMessages.genderOptions.f()}
                    </option>
                    <option value="o">
                      {globalMessages.genderOptions.o()}
                    </option>
                  </select>
                )}
              </div>
            </label>
          </div>
        );
      })}

      <button className="zetkin-joinform__submit-button" type="submit">
        {embeddingMessages.embedding.submitButton()}
      </button>
    </form>
  );
};
