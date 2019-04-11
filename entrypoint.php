<?php
header("Access-Control-Allow-Origin: *");
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  header('Location: '.'http://www.nutribaby.com.ar/');
}
error_reporting(E_ALL);
ini_set('display_errors', 1);

define("SERVERNAME", "internal-db.s27883.gridserver.com");
define("USERNAME", "db27883_obys");
define("PASSWORD", "h)FWoo9x@5]");
define("DBNAME", "db27883_mazda");
define("TABLENAME", "memorama_users");

//get score top
function getTop($count){
  $temp = [];
  $conn = new mysqli(SERVERNAME, USERNAME, PASSWORD, DBNAME);
  $sql = "SELECT * FROM ".TABLENAME." order by score desc limit $count";
  $result = $conn->query($sql);

  while($row = $result->fetch_assoc()) {
      $el = (object) [
        'name' => getInput($row['user_id'],'name'),
        'score' => getInput($row['user_id'],'score'),
        'start_time' => getInput($row['user_id'],'start_time'),
        'end_time' => getInput($row['user_id'],'end_time'),
        'mistakes' => getInput($row['user_id'],'mistakes')

      ];
      array_push($temp,$el);
  }
  return $temp;
}

//get specific input
function getInput($user,$input){
  $conn = new mysqli(SERVERNAME, USERNAME, PASSWORD, DBNAME);
  $sql = "SELECT * FROM ".TABLENAME." WHERE user_id = $user";
  $result = $conn->query($sql);
  return $result->fetch_assoc()["$input"];
}
//upate Field
function updateInput($user,$input,$value){
  $conn = new mysqli(SERVERNAME, USERNAME, PASSWORD, DBNAME);
  $sql = "UPDATE ".TABLENAME." SET $input = '$value' WHERE user_id = $user";
  $conn->query($sql);
  $conn->close();

}


//retrieve user data
function getData($userId){
  $el = (object) [
    'user_id' => getInput($userId,'user_id'),
    'cards' => getInput($userId,'cards'),
    'score' => getInput($userId,'score'),
    'full_name' => getInput($userId,'full_name'),
    'mistakes' => getInput($userId,'mistakes'),
    'multiplier' => getInput($userId,'multiplier'),
    'start_time' => getInput($userId,'start_time'),
    'end_time' => getInput($userId,'end_time'),
    'tryNumber' => getInput($userId,'tryNumber'),
    'name' => getInput($userId,'name'),
    'email' => getInput($userId,'email'),
    'phone' => getInput($userId,'phone'),
    'top' => getTop(9999999)
  ];
  return $el;
}

//register user
function completeRegister($userId,$fullName,$phone,$email,$full_email){
  updateInput($userId,'full_name',$fullName);
  updateInput($userId,'phone',$phone);
  updateInput($userId,'email',$email);
  updateInput($userId,'full_email',$full_email);
  //updateInput($userId,'start_time',date_timestamp_get(date_create()));
}

function endGame($userId,$mistakes,$cards,$startTime){
  updateInput($userId,'score',800);
  updateInput($userId,'end_time',date_timestamp_get(date_create()));
  updateInput($userId,'mistakes',$mistakes);
  updateInput($userId,'cards',$cards);


}

function registerUser($userId,$name){
  $date = date("Y-m-d-h-m-s");
  $conn = new mysqli(SERVERNAME, USERNAME, PASSWORD, DBNAME);
  $sql = "INSERT INTO ".TABLENAME."(user_id,cards,score,full_name,mistakes,multiplier,start_time,end_time,tryNumber,name,email,phone,registered_date) VALUES ('$userId',null,null,null,0,1,0,0,0,'$name',null,null,'$date')";
  if($conn->query($sql) === TRUE ){
    return getData($userId);
  }else{
    echo "Error registering user";
  }
}



//isert specific input
function insertData($user,$input,$value){
  $conn = new mysqli(SERVERNAME, USERNAME, PASSWORD, DBNAME);
  $sql = "UPDATE ".TABLENAME." SET $input = '$value' WHERE user_id = $user";
  $conn->exec($sql);
}

function decode($data){
  $temp = [];
  foreach ($data as $key => $value) {
    $temp = json_decode(base64_decode($key),true);
    break;
  }
  return $temp;
}


$decoded = decode($_POST);


switch ($decoded['action']) {
  case 'login':
  if(getInput($decoded['user_id'],'user_id')) { //registered user
    echo json_encode(getData($decoded['user_id']));
  }else{
    echo json_encode(registerUser($decoded['user_id'],$decoded['name'])); //register user
  }
  break;
  case 'complete':
  if(!getInput($decoded['user_id'],'user_id')) { //registered user
    echo "no user found";
  }else{
    completeRegister($decoded['user_id'],$decoded['full_name'],$decoded['phone'],$decoded['email'],$decoded['full_email']);
    echo json_encode(getData($decoded['user_id']));
  }
  break;
  case 'endGame':
  if(!getInput($decoded['user_id'],'user_id')) { //registered user
    echo "no user found";
  }else{
    endGame($decoded['user_id'],$decoded['mistakes'],$decoded['cards'],$decoded['startTime']);
    echo json_encode(getData($decoded['user_id']));
  }
  break;
  case 'set_start_time':
  if(!getInput($decoded['user_id'],'user_id')) { //registered user
    echo "no user found";
  }else{
    updateInput($decoded['user_id'],'start_time',date_timestamp_get(date_create()));
    echo json_encode(getData($decoded['user_id']));
  }
  break;
  default:
  echo "no action provided";
  break;
}

?>
