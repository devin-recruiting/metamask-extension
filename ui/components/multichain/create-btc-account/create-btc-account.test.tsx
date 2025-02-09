/* eslint-disable jest/require-top-level-describe */
import React from 'react';
import { JsonRpcRequest } from '@metamask/utils';
import { BtcAccountType, BtcMethod } from '@metamask/keyring-api';
import messages from '../../../../app/_locales/en/messages.json';
import { fireEvent, renderWithProvider, waitFor } from '../../../../test/jest';
import configureStore from '../../../store/store';
import mockState from '../../../../test/data/mock-state.json';
import { MultichainNetworks } from '../../../../shared/constants/multichain/networks';
import { CreateBtcAccount } from '.';

const ACCOUNT_NAME = 'Bitcoin Account';

const mockBtcAccount = {
  type: BtcAccountType.P2wpkh,
  id: '8a323a0b-9ff5-4ab6-95e0-d51ec7e09763',
  address: 'bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k',
  options: {
    scope: MultichainNetworks.BITCOIN,
    index: 0,
  },
  methods: [BtcMethod.SendMany],
};
const render = (
  props = { onActionComplete: jest.fn(), onCreateAccount: jest.fn() },
) => {
  const store = configureStore(mockState);
  return renderWithProvider(
    <CreateBtcAccount address={mockBtcAccount.address} {...props} />,
    store,
  );
};

const mockBitcoinWalletSnapSend = jest.fn().mockReturnValue(mockBtcAccount);
const mockSetAccountLabel = jest.fn().mockReturnValue({ type: 'TYPE' });

jest.mock('../../../store/actions', () => ({
  forceUpdateMetamaskState: jest.fn(),
  setAccountLabel: (address: string, label: string) =>
    mockSetAccountLabel(address, label),
}));

jest.mock(
  '../../../../app/scripts/lib/snap-keyring/bitcoin-wallet-snap',
  () => ({
    BitcoinWalletSnapSender: jest.fn().mockImplementation(() => {
      return {
        send: (_request: JsonRpcRequest) => {
          return mockBitcoinWalletSnapSend();
        },
      };
    }),
  }),
);

describe('CreateBtcAccount', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('displays account name input and suggests name', async () => {
    const { getByPlaceholderText } = render();

    await waitFor(() =>
      expect(getByPlaceholderText(ACCOUNT_NAME)).toBeInTheDocument(),
    );
  });

  it('fires onActionComplete when "Cancel" has been clicked', async () => {
    const onActionComplete = jest.fn();
    const { getByText, getByPlaceholderText } = render({
      onActionComplete,
      onCreateAccount: jest.fn(),
    });

    const input = await waitFor(() => getByPlaceholderText(ACCOUNT_NAME));
    const newAccountName = 'New Account Name';

    fireEvent.change(input, {
      target: { value: newAccountName },
    });
    fireEvent.click(getByText(messages.cancel.message));
    await waitFor(() => expect(onActionComplete).toHaveBeenCalled());
  });

  it('fires onCreateAccount when "Add Account" has been clicked', async () => {
    const onCreateAccount = jest.fn();
    const { getByText, getByPlaceholderText } = render({
      onActionComplete: jest.fn(),
      onCreateAccount,
    });

    const input = await waitFor(() => getByPlaceholderText(ACCOUNT_NAME));
    const newAccountName = 'New Account Name';

    fireEvent.change(input, {
      target: { value: newAccountName },
    });
    fireEvent.click(getByText(messages.addAccount.message));

    await waitFor(() => expect(onCreateAccount).toHaveBeenCalled());
  });

  it(`doesn't allow duplicate account names`, async () => {
    const { getByText, getByPlaceholderText } = render();

    const input = await waitFor(() => getByPlaceholderText(ACCOUNT_NAME));
    const usedAccountName =
      mockState.metamask.internalAccounts.accounts[
        '07c2cfec-36c9-46c4-8115-3836d3ac9047'
      ].metadata.name;

    fireEvent.change(input, {
      target: { value: usedAccountName },
    });

    const submitButton = getByText(messages.addAccount.message);
    expect(submitButton).toHaveAttribute('disabled');
  });
});
