// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

/**
* @title SolidityGuesser
* @notice This contract was created to be used as an automated "lottery". The user can pay a small fee to try to guess a random number with 4 digits. 
* If he gets it right, he earns the prize, which consists of every fee payed since the last right guess.
* @dev In contracts like this one, we have to deal with randomness, which is not an easy subject when we are using a blockchain. To deal with this, we have some alternatives. The best one is probably Oracles, like Chainlink's VRF,
* but for our usecase that would be quite expensive... since we can't store the number on the blockchain (it would be visible to the users through the transactions), we need to generate a random number for each attempt. 
* For each one, we would have to pay the LINK fees. In this file, we are setting the number manually just for test purposes. But for the real contract, we would probably use some blockchain variables, like block.timestamp combined with others, 
* to make it really hard to predict the number.
*/
contract SolidityGuesser {

    /**
    * @dev The contract uses some control variables to work. They are pretty straight forward, so they don't require specific explanation. Just keep in mind that the guessFee and cooldownTime can
    * be changed later through some contract functions to make it more flexible (if the ETH price goes up, for example, we can lower the fee).
    */
    address payable private _owner;
    uint32 private _currentNumber;
    uint32 public currentNumberOfGuesses;
    uint public guessFee = 0.001 ether;
    uint public prize = 0;
    uint cooldownTime = 30 seconds;


    /**
    * @notice Mapping to control the user cooldown time.
    */
    mapping(address => uint256) _guessCooldown;

    /**
    * @notice The contract has three events to make sure the frontend/other listeners always have the most updated data.
    * @dev The "NewGuess" event has the indexed guesser attribute because he is used as a "database" in the frontend to get the last guesses of the user.
    */
    event NewGuess(address indexed guesser, uint256 date, uint32 guess, bool correct);
    event NewPrize(uint256 prize);
    event NewGuessFee(uint guessFee);

    /**
    * @dev The constructor sets the original `owner` of the contract to the sender
    * account, and also manually sets the correct number so we can test the contract more easily.
    */
    constructor() {
        _owner = payable(msg.sender);
        _currentNumber = 1234;
    }

    receive() external payable{

    }

    /**
    * @notice Used to check if the person calling the function is the owner.
    */
    modifier onlyOwner() {
        require(msg.sender == _owner);
        _;
    }

    /**
    * @notice Used to check if the user calling the guess function is on cooldown.
    */
    modifier notOnCooldown() {
        require(_guessCooldown[msg.sender] <= block.timestamp, "You have to wait for the cooldown time before trying again.");
        _;
    }
    
    /**
    * @notice Function used to change the default cooldown time between guesses.
    * @dev Can only be used by the owner of the contract.
    * @param newCooldownTime New desired cooldown.
    */
    function changeCooldown(uint newCooldownTime) external onlyOwner {
        cooldownTime = newCooldownTime;
    }

    /**
    * @notice Function used to change the guess fee.
    * @dev Can only be used by the owner of the contract.
    * @param newFee New desired guess fee.
    */
    function changeGuessFee(uint newFee) external onlyOwner {
        guessFee = newFee;
        emit NewGuessFee(guessFee);
    }

    /**
    * @notice Simple function used to return the current guess fee.
    */
    function getGuessFee() external view returns(uint) {
        return guessFee;
    }

    /**
    * @notice Simple function used to return the current prize.
    */
    function getCurrentPrize() external view returns(uint) {
        return address(this).balance;
    }

    /**
    * @notice Simple function used to return the current number of guesses. The number of guesses reset every time a user guesses correctly.
    */
    function getCurrentNumberOfGuesses() external view returns(uint) {
        return currentNumberOfGuesses;
    }

    /**
    * @notice The main contract function that is used do proccess a guess.
    * @dev This function could change a bit depending on the chosen randomness method. Since we are using a hardcoded number for test purposes, we can just compare the guess with the number to see if the user
    * guessed it correctly. Here, we check if the user is on cooldown and if the value sent is equal to the fee value. We also trigger the user's cooldown, increment the number of guesses and emit the events accordingly.
    * @param _guess The user's guess.
    */
    function guess(uint32 _guess) external payable notOnCooldown() {
        require(msg.value == guessFee, "The value that was sent is not the current guess fee.");
        _triggerCooldown();
        currentNumberOfGuesses++;
        
        if (_guess == _currentNumber) {
            (bool callResult, ) = msg.sender.call{value: address(this).balance}("");
            if(!callResult) revert("Something went wrong with the transfer.");

            currentNumberOfGuesses = 0;
            emit NewGuess(msg.sender, block.timestamp, _guess, true);
        } else {
            emit NewGuess(msg.sender, block.timestamp, _guess, false);
        }
        
        emit NewPrize(address(this).balance);
    }

    /**
    * @notice Function used to put the user in a cooldown after a guess.
    */
    function _triggerCooldown() private {
        _guessCooldown[msg.sender] = block.timestamp + cooldownTime;
    }

}