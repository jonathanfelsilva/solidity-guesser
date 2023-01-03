# solidity-guesser
Solidity project created during the study of programming in blockchains. The main idea behind the project is to serve as a "lottery". The user can pay a small fee to try to guess a random number with 4 digits. If he gets it right, he earns the prize, which consists of every fee payed since the last right guess.

In contracts like this one, we have to deal with randomness, which is not an easy subject when we are using a blockchain. To deal with this, we have some alternatives. The best one is probably Oracles, like [Chainlink's VRF](https://docs.chain.link/vrf/v2/introduction/), but for our usecase that would be quite expensive... since we can't store the number on the blockchain (it would be visible to the users through the transactions), we need to generate a random number for each attempt, and for each one, we would have to pay the LINK fees. 

In this specific repository, we are setting the number manually just for test purposes. But for the real contract, if we chose not to use Oracles, we would probably use some blockchain variables, like block.timestamp combined with others, to make it really hard to predict the number.

## Setup

In the index.js file located on the **src** folder you already have the address of the contract. The network used for the deploy was the **Goerli ETH Testnet**.

To run the project locally, you will need a server. The easiest way is to install [Python](https://www.python.org/) and, from the **src** folder, open the terminal and run *python -m http.server 8000*. After that, just type *http://localhost:8000/index.html* in your browser and it should work.

Also, to actually try to guess the number, you will need a browser wallet. I used [Metamask](https://metamask.io/) during the development and it worked great!

To get the GoerliETH (testnet money), you can use this site: [Goerli Faucet](https://goerlifaucet.com/). Click [HERE](https://medium.com/@mwhc00/how-to-enable-ethereum-test-networks-on-metamask-again-d7831da23a09#:~:text=The%20test%20networks%20are%20already,That's%20it!) to see a quick tutorial on how to configure your metamask so it can show the Ethereum Testnets.