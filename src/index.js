const contractAddress = '0x4f39a2271B835cb5530b39e3dea57bfb9EE0484D'
const goerliNetworkId = 5

// Would be an environment variable / Oracle in a production project
const binanceApiUrl = 'https://data.binance.com/api/v3/avgPrice?symbol=ETHBUSD'

let solidityGuesser
let userAccount
let guessFee
let prize
let ethPrice
let lastGuessesShowing = false

async function connectToMetamask() {
    if (window.ethereum && window.ethereum.networkVersion == goerliNetworkId) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        userAccount = accounts[0]

        window.ethereum.on('accountsChanged', function (accounts) {
            userAccount = accounts[0]
        });

        window.web3 = new Web3(window.ethereum)
    } else {
        window.web3 = new Web3('https://rpc.ankr.com/eth_goerli')
    }
}

function startApp() {
    if (window.ethereum && window.ethereum.networkVersion == goerliNetworkId) {
        solidityGuesser = new window.web3.eth.Contract(solidityGuesserAbi, contractAddress)
        document.getElementById('main-div').hidden = false

        initializeEventListeners()
    } else {
        document.getElementById('metamask-instructions-div').hidden = false
        solidityGuesser = new window.web3.eth.Contract(solidityGuesserAbi, contractAddress)
    }
}

function initializeEventListeners() {
    solidityGuesser.events.NewGuess().on("data", function (event) {
        _getCurrentNumberOfGuesses()
    }).on("error", function (error) {
        console.log(error)
    });

    solidityGuesser.events.NewPrize().on("data", function (event) {
        prize = _formatPrice(event.returnValues.prize)
        document.getElementById('prize').innerText = prize
        _setPricesInDollar()
    }).on("error", function (error) {
        console.log(error)
    });

    solidityGuesser.events.NewGuessFee().on("data", function (event) {
        _getCurrentGuessFee()
    }).on("error", function (error) {
        console.log(error)
    });
}

async function _getCurrentGuessFee() {
    guessFee = await solidityGuesser.methods.getGuessFee().call()
    guessFee = _formatPrice(guessFee)
    document.getElementById('guess-fee').innerText = guessFee
}

async function _getCurrentPrize() {
    prize = await solidityGuesser.methods.getCurrentPrize().call()
    prize = _formatPrice(prize)
    document.getElementById('prize').innerText = prize
}

async function _getCurrentNumberOfGuesses() {
    const numberOfGuesses = await solidityGuesser.methods.getCurrentNumberOfGuesses().call()
    document.getElementById('guesses').innerText = numberOfGuesses
}

async function _getEthereumPrice() {
    const response = await fetch(binanceApiUrl)
    const data = await response.json()
    ethPrice = data.price
    _setPricesInDollar()
}

function _setPricesInDollar() {
    document.getElementById('guess-fee-price-dollar').innerText = (ethPrice * parseFloat(guessFee)).toFixed(2)
    document.getElementById('prize-dollar').innerText = (ethPrice * parseFloat(prize)).toFixed(2)
}

function getUserGuesses() {
    if (lastGuessesShowing) {
        document.getElementById('user-guesses').innerText = ""
        document.getElementById('view-guesses-button').innerText = "View my last guesses"
        lastGuessesShowing = false
    } else {
        _updateLastGuesses()
    }
}

async function _updateLastGuesses() {
    try {
        const events = await solidityGuesser.getPastEvents("NewGuess", { fromBlock: 0, toBlock: "latest", filter: { guesser: userAccount } })
        _renderUserGuesses(events)
        document.getElementById('view-guesses-button').innerText = "Hide my last guesses"
        lastGuessesShowing = true
    } catch {
        document.getElementById('user-guesses').innerText = "There was an error trying to get your guesses. Please, try again."
    }
}

function _renderUserGuesses(events) {
    const guessesDiv =  document.getElementById('user-guesses')

    // Reset the table
    guessesDiv.innerText = "";

    // Create the table and add the bootstrap classes
    const table = document.createElement('table')
    table.classList.add('table')
    table.classList.add('text-white')

    // Create the THEAD and the header row
    const thead = document.createElement('thead')
    const headRow = document.createElement('tr')
    
    // Create the date, guess and result columns
    const dateColumn = document.createElement('th')
    dateColumn.innerText = 'Date'
    dateColumn.scope = 'col'
    
    const guessColumn = document.createElement('th')
    guessColumn.innerText = 'Guess'
    guessColumn.scope = 'col'

    const resultColumn = document.createElement('th')
    resultColumn.innerText = 'Result'
    resultColumn.scope = 'col'

    // Append the columns
    headRow.append(dateColumn)
    headRow.append(guessColumn)
    headRow.append(resultColumn)

    // Append the row in the header
    thead.append(headRow)

    // Append the header in the table
    table.append(thead)

    // Create the table body
    const tBody = document.createElement('tbody')

    // Reverse the events to get the latest ones and define the number of iterations
    events.reverse()
    const numberOfIterations = events.length > 5 ? 5 : events.length

    for (let i = 0; i < numberOfIterations; i++) {
        const guess = events[i].returnValues
        const date = `${new Date(guess.date * 1000).toLocaleDateString()} ${new Date(guess.date * 1000).toLocaleTimeString()}`;

        // Create the table row
        const tr = document.createElement('tr')

        // Generate the informations by guess (date, guess and result)
        const dateInfo = document.createElement('td')
        dateInfo.innerText = date

        const guessInfo = document.createElement('td')
        guessInfo.innerText = guess.guess

        const resultInfo = document.createElement('td')
        resultInfo.innerText = guess.correct ? 'Correct guess' : 'Wrong guess'

        // Append them
        tr.append(dateInfo)
        tr.append(guessInfo)
        tr.append(resultInfo)

        // Append the finalized row
        tBody.append(tr)
    }

    // Append the table body onto the table and append the table in the main div
    table.append(tBody)
    guessesDiv.append(table)
}

async function guess() {
    let statusImageElement = document.getElementById('status-image')
    let guessStatusElement = document.getElementById('guess-status')
    let guessValue = document.getElementById("guess").value

    try {
        if (guessValue.length != 4) {
            statusImageElement.src = ""
            guessStatusElement.innerText = "You have to guess a number with 4 digits. Check your input and try again."

        } else {
            statusImageElement.src = "https://raw.githubusercontent.com/Codelessly/FlutterLoadingGIFs/master/packages/circular_progress_indicator_selective.gif"
            guessStatusElement.innerText = "Calling the blockchain to check your guess... please accept the transaction in your wallet. (estimated time: 15 seconds)"

            // Calling first to see if a revert error happens
            await solidityGuesser.methods.guess(guessValue).call({ from: userAccount, value: web3.utils.toWei(guessFee, "ether") })
            const guessReturn = await solidityGuesser.methods.guess(guessValue).send({ from: userAccount, value: web3.utils.toWei(guessFee, "ether") })

            const returnValues = guessReturn.events.NewGuess.returnValues

            if (returnValues.guess === guessValue && returnValues.correct) {
                statusImageElement.src = "https://media1.giphy.com/media/1wX5TJZPqVw3HhyDYn/giphy.gif?cid=6c09b952f050a33cf78685195823d396b626274d86a0433a&rid=giphy.gif&ct=s"
                guessStatusElement.innerText = "You won! Congratulations!! The prize has been transfered to your wallet."
            } else {
                statusImageElement.src = "https://media2.giphy.com/media/kfS15Gnvf9UhkwafJn/giphy.gif?cid=6c09b952b3a596ec6d0562f6d82899e3de139373733b52ea&rid=giphy.gif&ct=g"
                guessStatusElement.innerText = "Sorry... you didn't guess the right number. Better luck next time!"
            }

            _updateLastGuesses()
        }

    } catch (error) {
        guessStatusElement.innerText = error.message.includes('cooldown time')
            ? "You have to wait 30 seconds before trying again."
            : "Something wrong happened with the transaction or it was rejected by you. Please, try again."
        statusImageElement.height = 50
        statusImageElement.src = "https://images.emojiterra.com/google/android-10/512px/26a0.png"
    }

}

function _formatPrice(price) {
    price = price.toString()

    while (price.length < 18) {
        price = '0' + price
    }

    price = '0.' + price
    price = price.substring(0, 5)
    return price
}

// Start of the application
window.addEventListener('load', async function () {
    await connectToMetamask()
    startApp()

    _getCurrentGuessFee()
    _getCurrentPrize()
    _getCurrentNumberOfGuesses()
    _getEthereumPrice()

    setInterval(() => {
        _getEthereumPrice()
    }, 60000);
})