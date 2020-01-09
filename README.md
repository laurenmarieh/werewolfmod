# werewolfmod
### Slackbot for modding Werewolf games with poll support

## Usage

### How to Use Modbot
#### Create a New Poll
  ```/werewolf poll "Name of Poll" Person1, Person2, Person3...```  
 
  ```/ww poll "Name of Poll" Person1, Person2, Person3...```  
#### View Poll Results
  ```/werewolf results```  
  ```/ww results```  
#### Vote on a Poll
  ```/werewolf vote <number>```  
  ```/ww vote <number>```  
#### Remove your vote
(You can also use remove,annul,rescind,repeal)  
  ```/werewolf unvote```  
  ```/ww unvote```  
#### Close a Poll
  ```/werewolf close```  
  ```/ww close```  
#### Enable/Disable Auto-KillShot
 ```/ww options ks on```  
  or  
 ```/ww options ks off```
#### Create a new game (With Role Auto-assignment)(WIP)
  ```/werewolf game```  
  ```/ww game```  
#### Send a message to the channel as Moderator 
(Use optional -here flag to ping the channel  
  ```/modspeak <flags[-here, -b, -tb]> <Text to send to Channel>```  
    Modspeak flags add the following functionality  
* -here : pings the channel  
* -b : Formats your message in bold  
* -tb: Formats your message in a text box  
     If you do not provide a formatting flag(-b, -tb), then the formatting provided in your message will be used.