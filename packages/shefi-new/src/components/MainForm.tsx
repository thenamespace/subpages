"use client";
import { useCallback, useEffect, useState, useMemo } from "react";
import { Button } from "./Button";
import { Input } from "./Input";
import { Modal } from "./Modal";
import { Text } from "./Text";
import { Spinner } from "./Spinner";
import { normalize } from "viem/ens";
import { useAccount, useSwitchChain } from "wagmi";
import { ENS_NAME, useNamepsaceClient } from "./useNamespaceClient";
import { debounce } from "lodash";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Hash } from "viem";
import toast from "react-hot-toast";
import axios from "axios";
import { getWhitelist } from "@/api/api";
import { SuccessModal } from "./SuccessModal";
import { SetPrimaryNameModal } from "./SetPrimaryNameModal";
import { L2_CHAIN_ID, PARENT_NAME } from "@/constants";
import { usePrimaryName } from "@/contexts/PrimaryNameContext";
import {
  SelectRecordsForm,
  type EnsRecords,
  getSupportedAddressByName,
  type SupportedEnsAddress,
} from "@thenamespace/ens-components";
import "./MainFormOverride.css";

const MIN_NAME_LENGTH = 3;
const eth_address = getSupportedAddressByName("eth") as SupportedEnsAddress;

enum RegistrationStep {
  AVAILABILITY = "availability",
  REGISTER_RECEIPT = "register_receipt",
  TX_PENDING = "tx_pending",
  SUCCESS = "success",
}

export const MintForm = () => {
  const [label, setLabel] = useState("");
  const { address, chainId, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();
  const { checkAvailable, waitForTx } = useNamepsaceClient();
  const { refreshPrimaryName } = usePrimaryName();

  const [nameAvailable, setNameAvailable] = useState<{
    isChecking: boolean;
    isAvailable: boolean;
  }>({
    isChecking: false,
    isAvailable: false,
  });

  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>(
    RegistrationStep.AVAILABILITY,
  );

  const [isWaitingWallet, setIsWaitingWallet] = useState(false);
  const [txHash, setTxHash] = useState<Hash>();

  // Profile/Records state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [records, setRecords] = useState<EnsRecords>({
    addresses: [],
    texts: [],
  });
  const [profileSet, setProfileSet] = useState(false);

  // Success/Primary name modals
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPrimaryNameModal, setShowPrimaryNameModal] = useState(false);

  // Whitelist state
  const [whitelistConfig, setWhitelistConfig] = useState<{
    featureEnabled: boolean;
    isWhitelisted: boolean;
    isChecking: boolean;
  }>({
    featureEnabled: false,
    isWhitelisted: true,
    isChecking: true,
  });

  // Initialize records with user's address when connected
  useEffect(() => {
    if (address && records.addresses.length === 0) {
      setRecords({
        ...records,
        addresses: [{ coinType: eth_address.coinType, value: address }],
      });
    }
  }, [address]);

  // Check whitelist
  useEffect(() => {
    if (!address) return;

    getWhitelist()
      .then((res) => {
        let isWhitelisted = true;
        // Check if whitelist feature is enabled (type !== 0) and whitelist data exists
        const hasWhitelist =
          res?.whitelist && typeof res.whitelist.type === "number";
        let featureEnabled = hasWhitelist && res.whitelist.type !== 0;

        if (featureEnabled && res.whitelist) {
          const wallets = res.whitelist.wallets || [];
          isWhitelisted =
            wallets.find(
              (i) => i.toLocaleLowerCase() === address!.toLocaleLowerCase(),
            ) !== undefined;
        }

        setWhitelistConfig({
          featureEnabled: featureEnabled,
          isChecking: false,
          isWhitelisted: isWhitelisted,
        });
      })
      .catch((err) => {
        console.error("Whitelist check error:", err);
        // If whitelist check fails, allow minting (don't block users)
        setWhitelistConfig({
          featureEnabled: false,
          isChecking: false,
          isWhitelisted: true,
        });
      });
  }, [address]);

  // Count records set
  const recordsCount = useMemo(() => {
    let count = 0;
    records.texts.forEach((text) => {
      if (text.value && text.value.length > 0) count++;
    });
    records.addresses.forEach((addr) => {
      if (addr.value && addr.value.length > 0) count++;
    });
    return count;
  }, [records]);

  // Get avatar from records
  const avatarUrl = useMemo(() => {
    const avatarRecord = records.texts.find((text) => text.key === "avatar");
    return avatarRecord?.value || undefined;
  }, [records]);

  const handleLabelChanged = (value: string) => {
    if (value.includes(".")) return;
    const _value = value.toLowerCase();

    try {
      normalize(_value);
    } catch (err) {
      return;
    }

    setLabel(_value);

    if (_value.length >= MIN_NAME_LENGTH) {
      setNameAvailable({ ...nameAvailable, isChecking: true });
      debouncedCheckName(_value);
    } else {
      setNameAvailable({ isChecking: false, isAvailable: false });
    }
  };

  const debouncedCheckName = useCallback(
    debounce(async (label: string) => {
      const available = await checkAvailable(label);
      setNameAvailable({
        isChecking: false,
        isAvailable: available,
      });
    }, 500),
    [],
  );

  const handleNext = async () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    } else if (chainId !== L2_CHAIN_ID) {
      await switchChainAsync({ chainId: L2_CHAIN_ID });
      return;
    } else {
      setRegistrationStep(RegistrationStep.REGISTER_RECEIPT);
    }
  };

  const handleRegister = async () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    if (label.length < MIN_NAME_LENGTH) {
      toast.error(`Name must be at least ${MIN_NAME_LENGTH} characters`);
      return;
    }

    if (!nameAvailable.isAvailable) {
      toast.error("This name is not available");
      return;
    }

    setIsWaitingWallet(true);

    let submittedTxHash: Hash | undefined;

    try {
      // Prepare records for API
      const recordsPayload = {
        texts: records.texts.filter((t) => t.value && t.value.length > 0),
        addresses: records.addresses.filter(
          (a) => a.value && a.value.length > 0,
        ),
      };

      const { data } = await axios.post<{ tx: Hash }>("/api/mint", {
        owner: address,
        label: label,
        records: recordsPayload,
      });

      submittedTxHash = data.tx;
      setTxHash(data.tx);
      setRegistrationStep(RegistrationStep.TX_PENDING);
    } catch (err: any) {
      console.error("Mint API error:", err);
      setIsWaitingWallet(false);

      if (err?.response?.data?.error) {
        const errorMsg = err.response.data.error;
        if (errorMsg.includes("SUBNAME_TAKEN")) {
          toast.error("This name is already taken");
        } else if (errorMsg.includes("MINTER_NOT_WHITELISTED")) {
          toast.error("You are not whitelisted");
        } else {
          toast.error("Registration failed. Please try again.");
        }
      } else if (
        err?.message?.includes("User denied") ||
        err?.message?.includes("rejected")
      ) {
        // User rejected - no toast
      } else {
        toast.error("Registration failed. Please try again.");
      }
      return;
    }

    // Transaction was submitted successfully, now wait for confirmation
    // Errors during waiting should NOT show error toast since tx is already on-chain
    try {
      await waitForTx(submittedTxHash);

      // Show success modal
      setShowSuccessModal(true);
      setRegistrationStep(RegistrationStep.SUCCESS);
    } catch (err: any) {
      console.error("Tx confirmation error:", err);
      // Transaction is already on-chain, so still show success
      // The user can check the transaction on the block explorer
      setShowSuccessModal(true);
      setRegistrationStep(RegistrationStep.SUCCESS);
    } finally {
      setIsWaitingWallet(false);
    }
  };

  const handleProfileSave = () => {
    const anyRecordsSet =
      records.texts.length > 0 &&
      records.texts.find((txt) => txt.value && txt.value.length > 0) !==
        undefined;
    setProfileSet(anyRecordsSet);
    setIsProfileModalOpen(false);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Reset form
    setLabel("");
    setRecords({ addresses: [], texts: [] });
    setProfileSet(false);
    setRegistrationStep(RegistrationStep.AVAILABILITY);
  };

  const handleOpenPrimaryNameModal = () => {
    setShowSuccessModal(false);
    setShowPrimaryNameModal(true);
  };

  const handlePrimaryNameSuccess = async () => {
    setShowPrimaryNameModal(false);
    await refreshPrimaryName(true);
    // Reset form
    setLabel("");
    setRecords({ addresses: [], texts: [] });
    setProfileSet(false);
    setRegistrationStep(RegistrationStep.AVAILABILITY);
  };

  const getNextButtonLabel = () => {
    if (!isConnected) return "Connect Wallet";
    if (chainId !== L2_CHAIN_ID) return "Switch to Base";
    return "Continue";
  };

  const isNextButtonEnabled = () => {
    if (!isConnected || chainId !== L2_CHAIN_ID) return true;
    return (
      label.length >= MIN_NAME_LENGTH &&
      !nameAvailable.isChecking &&
      nameAvailable.isAvailable
    );
  };

  const showNotWhitelistedBtn =
    !whitelistConfig.isChecking &&
    whitelistConfig.featureEnabled &&
    !whitelistConfig.isWhitelisted;

  const fullName = `${label}.${PARENT_NAME}`;

  return (
    <>
      <div className="flex w-full max-w-md flex-col gap-4">
        {/* Step 1: Availability Check */}
        {registrationStep === RegistrationStep.AVAILABILITY && (
          <>
            <div className="space-y-2">
              <Text size="sm" color="gray">
                Choose your name
              </Text>
              <Input
                name="name"
                placeholder="Enter your name"
                suffix={`.${PARENT_NAME}`}
                onChange={(e) => handleLabelChanged(e.target.value)}
                value={label}
              />
            </div>

            {/* Name length warning */}
            {label.length > 0 && label.length < MIN_NAME_LENGTH && (
              <Text size="sm" color="gray">
                Name must be at least {MIN_NAME_LENGTH} characters
              </Text>
            )}

            {/* Availability status */}
            {label.length >= MIN_NAME_LENGTH && (
              <div className="flex items-center gap-2">
                {nameAvailable.isChecking ? (
                  <>
                    <Spinner />
                    <Text size="sm" color="gray">
                      Checking availability...
                    </Text>
                  </>
                ) : (
                  <Text
                    size="sm"
                    color={nameAvailable.isAvailable ? "green" : "red"}
                    weight="medium"
                  >
                    {fullName} is{" "}
                    {nameAvailable.isAvailable ? "available!" : "unavailable"}
                  </Text>
                )}
              </div>
            )}

            {/* Next button */}
            {!showNotWhitelistedBtn && (
              <Button
                onClick={handleNext}
                disabled={!isNextButtonEnabled()}
                loading={nameAvailable.isChecking}
              >
                {getNextButtonLabel()}
              </Button>
            )}

            {showNotWhitelistedBtn && <Button disabled>Not whitelisted</Button>}
          </>
        )}

        {/* Step 2: Register Receipt (with profile setup) */}
        {registrationStep === RegistrationStep.REGISTER_RECEIPT && (
          <>
            <div className="rounded-2xl border-2 border-brand-accent bg-white p-6 text-center shadow-lg shadow-brand-accent/10">
              <Text size="sm" color="gray">
                Registering
              </Text>
              <Text size="2xl" weight="bold" className="mt-1">
                {fullName}
              </Text>
            </div>

            {/* Set Profile Button */}
            {!profileSet ? (
              <Button
                variant="secondary"
                onClick={() => setIsProfileModalOpen(true)}
              >
                + Set Profile
              </Button>
            ) : (
              <div
                className="flex cursor-pointer items-center gap-3 rounded-2xl bg-transparent p-3 focus:outline-none active:outline-none"
                onClick={() => setIsProfileModalOpen(true)}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-pinkBtn to-brand-lavender text-brand-accent">
                    <span className="text-lg font-bold">
                      {label.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 text-left">
                  <Text size="sm" weight="medium">
                    Profile Set
                  </Text>
                  <Text size="xs" color="gray">
                    {recordsCount} record{recordsCount !== 1 ? "s" : ""}{" "}
                    configured
                  </Text>
                </div>
                <Text size="sm" className="text-brand-accent">
                  Edit
                </Text>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  setRegistrationStep(RegistrationStep.AVAILABILITY)
                }
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleRegister}
                loading={isWaitingWallet}
                disabled={isWaitingWallet}
                className="flex-1"
              >
                {isWaitingWallet ? "Waiting..." : "Register"}
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Transaction Pending */}
        {registrationStep === RegistrationStep.TX_PENDING && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Spinner />
            <Text size="lg" weight="medium">
              Registering {fullName}...
            </Text>
            <Text size="sm" color="gray">
              Please wait while your transaction is being processed
            </Text>
            {txHash && (
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-accent underline hover:text-brand-dark transition-colors"
              >
                View on Basescan
              </a>
            )}
          </div>
        )}
      </div>

      {/* Profile Modal with SelectRecordsForm */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        className="max-w-lg p-0 max-h-[95vh]"
      >
        <div className="shefi-record-form">
          <SelectRecordsForm
            records={records}
            actionButtons={
              <div className="mt-4 action-btns flex gap-3 border-t border-gray-100 p-2">
                <Button
                  variant="outline"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleProfileSave} className="flex-1">
                  Save ({recordsCount})
                </Button>
              </div>
            }
            onRecordsUpdated={(updatedRecords: EnsRecords) => {
              setRecords(updatedRecords);
            }}
          />
        </div>
      </Modal>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        mintedName={fullName}
        onSetPrimaryName={handleOpenPrimaryNameModal}
      />

      {/* Primary Name Modal */}
      <SetPrimaryNameModal
        isOpen={showPrimaryNameModal}
        onClose={() => setShowPrimaryNameModal(false)}
        onSuccess={handlePrimaryNameSuccess}
        mintedName={fullName}
      />
    </>
  );
};
