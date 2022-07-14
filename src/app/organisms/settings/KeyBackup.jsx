/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './KeyBackup.scss';
import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import { openReusableDialog } from '../../../client/action/navigation';
import { deletePrivateKey } from '../../../client/state/secretStorageKeys';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import Spinner from '../../atoms/spinner/Spinner';
import InfoCard from '../../atoms/card/InfoCard';
import SettingTile from '../../molecules/setting-tile/SettingTile';

import { accessSecretStorage } from './SecretStorageAccess';

import InfoIC from '../../../../public/res/ic/outlined/info.svg';
import BinIC from '../../../../public/res/ic/outlined/bin.svg';
import DownloadIC from '../../../../public/res/ic/outlined/download.svg';

import { useStore } from '../../hooks/useStore';
import { useCrossSigningStatus } from '../../hooks/useCrossSigningStatus';

import '../../i18n.jsx'
import { useTranslation } from 'react-i18next';


function CreateKeyBackupDialog({ keyData }) {
  const [done, setDone] = useState(false);
  const mx = initMatrix.matrixClient;
  const mountStore = useStore();

  const { t } = useTranslation();

  const doBackup = async () => {
    setDone(false);
    let info;

    try {
      info = await mx.prepareKeyBackupVersion(
        null,
        { secureSecretStorage: true },
      );
      info = await mx.createKeyBackupVersion(info);
      await mx.scheduleAllGroupSessionsForBackup();
      if (!mountStore.getItem()) return;
      setDone(true);
    } catch (e) {
      deletePrivateKey(keyData.keyId);
      await mx.deleteKeyBackupVersion(info.version);
      if (!mountStore.getItem()) return;
      setDone(null);
    }
  };

  useEffect(() => {
    mountStore.setItem(true);
    doBackup();
  }, []);

  return (
    <div className="key-backup__create">
      {done === false && (
        <div>
          <Spinner size="small" />
          <Text>{t("KeyBackup.creating_backup")}</Text>
        </div>
      )}
      {done === true && (
        <>
          <Text variant="h1">{twemojify('✅')}</Text>
          <Text>{t("KeyBackup.backup_created")}</Text>
        </>
      )}
      {done === null && (
        <>
          <Text>{t("KeyBackup.backup_failed")}</Text>
          <Button onClick={doBackup}>{t("common.retry")}</Button>
        </>
      )}
    </div>
  );
}
CreateKeyBackupDialog.propTypes = {
  keyData: PropTypes.shape({}).isRequired,
};

function RestoreKeyBackupDialog({ keyData }) {

  const { t } = useTranslation();

  const [status, setStatus] = useState(false);
  const mx = initMatrix.matrixClient;
  const mountStore = useStore();

  const restoreBackup = async () => {
    setStatus(false);

    let meBreath = true;
    const progressCallback = (progress) => {
      if (!progress.successes) return;
      if (meBreath === false) return;
      meBreath = false;
      setTimeout(() => {
        meBreath = true;
      }, 200);

      setStatus({ message: t("KeyBackup.restoring_progress", {progress: progress.successes, total: progress.total}) });
    };

    try {
      const backupInfo = await mx.getKeyBackupVersion();
      const info = await mx.restoreKeyBackupWithSecretStorage(
        backupInfo,
        undefined,
        undefined,
        { progressCallback },
      );
      if (!mountStore.getItem()) return;
      setStatus({ done: t("KeyBackup.restore_complete", {progress: info.imported, total: info.total})});
    } catch (e) {
      if (!mountStore.getItem()) return;
      if (e.errcode === 'RESTORE_BACKUP_ERROR_BAD_KEY') {
        deletePrivateKey(keyData.keyId);
        setStatus({ error: t("KeyBackup.restore_failed_bad_key"), errorCode: 'BAD_KEY' });
      } else {
        setStatus({ error: t("KeyBackup.restore_failed_unknown"), errCode: 'UNKNOWN' });
      }
    }
  };

  useEffect(() => {
    mountStore.setItem(true);
    restoreBackup();
  }, []);

  return (
    <div className="key-backup__restore">
      {(status === false || status.message) && (
        <div>
          <Spinner size="small" />
          <Text>{status.message ?? t("KeyBackup.restoring")}</Text>
        </div>
      )}
      {status.done && (
        <>
          <Text variant="h1">{twemojify('✅')}</Text>
          <Text>{status.done}</Text>
        </>
      )}
      {status.error && (
        <>
          <Text>{status.error}</Text>
          <Button onClick={restoreBackup}>{t("common.retry")}}</Button>
        </>
      )}
    </div>
  );
}
RestoreKeyBackupDialog.propTypes = {
  keyData: PropTypes.shape({}).isRequired,
};

function DeleteKeyBackupDialog({ requestClose }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const mx = initMatrix.matrixClient;
  const mountStore = useStore();
  const { t } = useTranslation();

  const deleteBackup = async () => {
    mountStore.setItem(true);
    setIsDeleting(true);
    try {
      const backupInfo = await mx.getKeyBackupVersion();
      if (backupInfo) await mx.deleteKeyBackupVersion(backupInfo.version);
      if (!mountStore.getItem()) return;
      requestClose(true);
    } catch {
      if (!mountStore.getItem()) return;
      setIsDeleting(false);
    }
  };

  return (
    <div className="key-backup__delete">
      <Text variant="h1">{twemojify('🗑')}</Text>
      <Text weight="medium">{t("KeyBackup.delete_key_backup_subtitle")}</Text>
      <Text>{t("KeyBackup.delete_key_backup_message")}</Text>
      {
        isDeleting
          ? <Spinner size="small" />
          : <Button variant="danger" onClick={deleteBackup}>{t("common.delete")}</Button>
      }
    </div>
  );
}
DeleteKeyBackupDialog.propTypes = {
  requestClose: PropTypes.func.isRequired,
};

function KeyBackup() {
  const mx = initMatrix.matrixClient;
  const isCSEnabled = useCrossSigningStatus();
  const [keyBackup, setKeyBackup] = useState(undefined);
  const mountStore = useStore();
  const { t } = useTranslation();

  const fetchKeyBackupVersion = async () => {
    const info = await mx.getKeyBackupVersion();
    if (!mountStore.getItem()) return;
    setKeyBackup(info);
  };

  useEffect(() => {
    mountStore.setItem(true);
    fetchKeyBackupVersion();

    const handleAccountData = (event) => {
      if (event.getType() === 'm.megolm_backup.v1') {
        fetchKeyBackupVersion();
      }
    };

    mx.on('accountData', handleAccountData);
    return () => {
      mx.removeListener('accountData', handleAccountData);
    };
  }, [isCSEnabled]);

  const openCreateKeyBackup = async () => {
    const keyData = await accessSecretStorage(t('KeyBackup.create_backup_title'));
    if (keyData === null) return;

    openReusableDialog(
      <Text variant="s1" weight="medium">{t('KeyBackup.create_backup_title')}</Text>,
      () => <CreateKeyBackupDialog keyData={keyData} />,
      () => fetchKeyBackupVersion(),
    );
  };

  const openRestoreKeyBackup = async () => {
    const keyData = await accessSecretStorage(t('KeyBackup.restore_backup_title'));
    if (keyData === null) return;

    openReusableDialog(
      <Text variant="s1" weight="medium">{t('KeyBackup.restore_backup_title')}</Text>,
      () => <RestoreKeyBackupDialog keyData={keyData} />,
    );
  };

  const openDeleteKeyBackup = () => openReusableDialog(
    <Text variant="s1" weight="medium">{t('KeyBackup.delete_key_backup_title')}</Text>,
    (requestClose) => (
      <DeleteKeyBackupDialog
        requestClose={(isDone) => {
          if (isDone) setKeyBackup(null);
          requestClose();
        }}
      />
    ),
  );

  const renderOptions = () => {
    if (keyBackup === undefined) return <Spinner size="small" />;
    if (keyBackup === null) return <Button variant="primary" onClick={openCreateKeyBackup}>{t('KeyBackup.create_backup_tooltip')}</Button>;
    return (
      <>
        <IconButton src={DownloadIC} variant="positive" onClick={openRestoreKeyBackup} tooltip={t('KeyBackup.restore_backup_tooltip')} />
        <IconButton src={BinIC} onClick={openDeleteKeyBackup} tooltip={t('KeyBackup.delete_key_backup_tooltip')} />
      </>
    );
  };

  return (
    <SettingTile
      title={t("KeyBackup.encrypted_messages_backup_title")}
      content={(
        <>
          <Text variant="b3">{t("KeyBackup.encrypted_messages_backup_description")}</Text>
          {!isCSEnabled && (
            <InfoCard
              style={{ marginTop: 'var(--sp-ultra-tight)' }}
              rounded
              variant="caution"
              iconSrc={InfoIC}
              title={t("KeyBackup.encrypted_messages_backup_cross_signing_disabled")}
            />
          )}
        </>
      )}
      options={isCSEnabled ? renderOptions() : null}
    />
  );
}

export default KeyBackup;
