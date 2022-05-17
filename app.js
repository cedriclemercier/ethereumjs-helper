import Web3 from 'web3';
import axios from 'axios'
import 'dotenv/config'
import { Transaction } from 'ethereumjs-tx'
// import { default as common } from '@ethereumjs/common';
import Common from '@ethereumjs/common';
import { BASENUMBER } from '@binance-chain/javascript-sdk/lib/utils';

// ----------------------  Testing
// testnet
const web3 = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');
//const cmcapi_sandbox = 'https://sandbox-api.coinmarketcap.com/v2'
//const test_cmc_apikey = 'b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c'

// ----------------------------------------

// const web3 = new Web3('https://bsc-dataseed1.binance.org:443');
const to_wallet = '0xAAf25ECa8ABBcC3893EAD4bB8D3d3387Fd095B5e'
const from_wallet = '0xfF8a56169c7ED43dd671616ff00A7e35F01Ea906'
const cmcapi = 'https://pro-api.coinmarketcap.com/v2'

const privKey = Buffer.from(process.env.PRIVATE_KEY, 'hex');
const cmc_apikey = process.env.CMC_API_KEY


const chain = Common.default.forCustomChain(
    'mainnet', {
        name: 'bnb',
        networkId: 97,
        chainId: 97
    },
    'petersburg'
)

const getSymbol = () => {
    let symbol = ''
    let chain = ''
    switch (web3._provider.host) {
        case 'https://data-seed-prebsc-1-s1.binance.org:8545':
            symbol = 'BNB';
            chain = 'testnet'
            break
        case 'https://bsc-dataseed1.binance.org:443':
            symbol = 'BNB';
            chain = 'mainnet'
            break
        default:
            symbol = 'ETH';
            chain = 'mainnet'
            break
    }
    return [symbol, chain]
}

const getBalanceBNB = async(wallet_address) => {
    const account = await web3.eth.getBalance(wallet_address)
    const balance = await web3.utils.fromWei(account, 'ether')
    const fiat = await convertToFiat(balance, 'BNB')
    console.log("Amount of BNB in wallet: " + balance + ". Worth: $" + fiat)
    return balance
}


const convertToFiat = async(ether, symbol) => {

    let response = null
    let amount = ''

    if (ether < 1e-8) {
        amount = '0'
        return amount
    }

    try {
        response = await axios.get(`${cmcapi}/tools/price-conversion?amount=${ether}&symbol=${symbol}&convert=USD`, {
            headers: {
                'X-CMC_PRO_API_KEY': cmc_apikey,
                'Accept': 'application/json',
                'Accept-Encoding': 'deflate, gzip'
            },
        })
    } catch (err) {
        response = null
        console.log("Error in converting to Fiat!")
        console.log(err.response.data)
    }

    if (response) {
        const json = response.data;
        console.log(`Converting ${symbol} into USD`)
        amount = json.data[0].quote.USD.price
        return amount
    }
}

const sendEther = async(from_address, to_address, amount) => {

    const [symbol, net] = getSymbol()

    await web3.eth.getTransactionCount(from_address, (err, txCount) => {
        const txObject = {
            nonce: web3.utils.toHex(txCount),
            to: to_address,
            value: web3.utils.toHex(web3.utils.toWei(`${amount}`, 'ether')),
            gasLimit: web3.utils.toHex(100000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('100', 'gwei'))
        };

        const tx = new Transaction(txObject, { common: chain });
        tx.sign(privKey);

        const serializedTrans = tx.serialize();
        const raw = '0x' + serializedTrans.toString('hex');

        web3.eth.sendSignedTransaction(raw, (err, txHash) => {
            console.log(`Sending ${amount} ${symbol} from ${from_address} to ${to_address}`)
            console.log('txHash:', txHash)
        });
    });

}


async function main() {

    // Send 0.01 ETH from one wallet to another
    sendEther(from_wallet, to_wallet, 0.01)

    // // Get wallet balance
    // getBalanceBNB(from_wallet)

}

main()